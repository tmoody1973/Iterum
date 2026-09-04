'use client'

import { useAction, useConvex, useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import { createBlankCampaignState, createProjectKey } from '../lib/domain/blank-campaign'
import type { WorkspaceState } from '../lib/domain/types'
import type { ImageGenerationRun } from '../lib/image-generation/types'
import { createWorkspaceRuntime, type WorkspaceRuntime } from '../lib/domain/workspace-runtime'
import { toProjectSummary, type CreateProjectInput, type ProjectController, type ProjectSaveStatus, type ProjectVersionSummary } from '../lib/persistence/project-controller'

const AUTOSAVE_DELAY_MS = 500

function messageForError(error: unknown) {
  return error instanceof Error ? error.message : 'Convex could not save the project.'
}

export function usePersistentWorkspace(projectKey: string, seedState?: WorkspaceState) {
  const fallbackState = useMemo(() => seedState ?? createBlankCampaignState('Loading project'), [seedState])
  const runtimeRef = useRef<WorkspaceRuntime | null>(null)
  if (!runtimeRef.current) runtimeRef.current = createWorkspaceRuntime(fallbackState)
  const runtime = runtimeRef.current
  const convex = useConvex()
  const remoteProject = useQuery(api.projects.get, { projectKey })
  const ensureProject = useMutation(api.projects.ensure)
  const saveWorkspace = useMutation(api.projects.saveWorkspace)
  const createVersionMutation = useMutation(api.projects.createVersion)
  const restoreVersionMutation = useMutation(api.projects.restoreVersion)
  const executeImageGeneration = useAction(api.imageGeneration.execute)
  const createReviewerGrant = useAction(api.reviewerGrants.create)
  const authorizeReviewerCost = useAction(api.reviewerGrants.authorizeCost)
  const revokeReviewerGrant = useMutation(api.reviewerGrants.revoke)
  const markImageGenerationReview = useMutation(api.imageGeneration.markAwaitingReview)
  const [status, setStatus] = useState<ProjectSaveStatus>({ phase: 'loading', projectKey, headRevision: null, savedWorkspaceVersion: null, lastSavedAt: null, message: 'Opening cloud project…' })
  const statusRef = useRef(status)
  const hydratedRef = useRef(false)
  const ensureStartedRef = useRef(false)
  const suppressNextChangeRef = useRef(false)
  const headRevisionRef = useRef<number | null>(null)
  const savedWorkspaceVersionRef = useRef<number | null>(null)
  const pendingSnapshotRef = useRef<WorkspaceState | null>(null)
  const saveLoopRef = useRef<Promise<void> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const publishStatus = useCallback((next: ProjectSaveStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const runSaveLoop = useCallback(() => {
    if (saveLoopRef.current) return saveLoopRef.current
    saveLoopRef.current = (async () => {
      while (pendingSnapshotRef.current && headRevisionRef.current !== null) {
        const workspace = pendingSnapshotRef.current
        pendingSnapshotRef.current = null
        if (workspace.version <= (savedWorkspaceVersionRef.current ?? -1)) continue
        publishStatus({ ...statusRef.current, phase: 'saving', message: 'Saving to Convex…' })
        try {
          const saved = await saveWorkspace({ projectKey, expectedHeadRevision: headRevisionRef.current, workspace, idempotencyKey: crypto.randomUUID() })
          headRevisionRef.current = saved.headRevision
          savedWorkspaceVersionRef.current = saved.workspaceVersion
          publishStatus({ phase: 'saved', projectKey, headRevision: saved.headRevision, savedWorkspaceVersion: saved.workspaceVersion, lastSavedAt: saved.updatedAt, message: 'Saved to Convex' })
        } catch (error) {
          const message = messageForError(error)
          const isConflict = message.includes('HEAD_CONFLICT') || message.toLowerCase().includes('changed elsewhere')
          pendingSnapshotRef.current = null
          publishStatus({ ...statusRef.current, phase: isConflict ? 'conflict' : 'error', message: isConflict ? 'Cloud version conflict — reload before editing further.' : message })
          break
        }
      }
    })().finally(() => { saveLoopRef.current = null })
    return saveLoopRef.current
  }, [projectKey, publishStatus, saveWorkspace])

  const flush = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (hydratedRef.current) pendingSnapshotRef.current = runtime.getSnapshot()
    await runSaveLoop()
    return statusRef.current
  }, [runSaveLoop, runtime])

  useEffect(() => {
    if (remoteProject === undefined || hydratedRef.current) return
    if (remoteProject === null) {
      if (!seedState || ensureStartedRef.current) {
        if (!seedState) publishStatus({ phase: 'error', projectKey, headRevision: null, savedWorkspaceVersion: null, lastSavedAt: null, message: 'Project not found.' })
        return
      }
      ensureStartedRef.current = true
      void ensureProject({ projectKey, name: seedState.campaign.name, workspace: seedState, idempotencyKey: crypto.randomUUID() }).catch((error) => {
        publishStatus({ phase: 'error', projectKey, headRevision: null, savedWorkspaceVersion: null, lastSavedAt: null, message: messageForError(error) })
      })
      return
    }
    runtime.replaceSnapshot(remoteProject.workspace as WorkspaceState)
    hydratedRef.current = true
    headRevisionRef.current = remoteProject.headRevision
    savedWorkspaceVersionRef.current = remoteProject.workspaceVersion
    publishStatus({ phase: 'ready', projectKey, headRevision: remoteProject.headRevision, savedWorkspaceVersion: remoteProject.workspaceVersion, lastSavedAt: remoteProject.updatedAt, message: 'Cloud project ready' })
  }, [ensureProject, projectKey, publishStatus, remoteProject, runtime, seedState])

  useEffect(() => {
    if (!hydratedRef.current || !remoteProject || headRevisionRef.current === remoteProject.headRevision) return
    const hasLocalWork = Boolean(pendingSnapshotRef.current || saveLoopRef.current || timerRef.current)
    if (hasLocalWork) {
      publishStatus({ ...statusRef.current, phase: 'conflict', message: 'This project changed in the other agent session while local work was pending.' })
      return
    }
    suppressNextChangeRef.current = true
    runtime.replaceSnapshot(remoteProject.workspace as WorkspaceState)
    headRevisionRef.current = remoteProject.headRevision
    savedWorkspaceVersionRef.current = remoteProject.workspaceVersion
    publishStatus({ phase: 'saved', projectKey, headRevision: remoteProject.headRevision, savedWorkspaceVersion: remoteProject.workspaceVersion, lastSavedAt: remoteProject.updatedAt, message: 'Synced review decision from Convex' })
  }, [projectKey, publishStatus, remoteProject, runtime])

  useEffect(() => runtime.subscribe(() => {
    if (!hydratedRef.current) return
    if (suppressNextChangeRef.current) { suppressNextChangeRef.current = false; return }
    pendingSnapshotRef.current = runtime.getSnapshot()
    publishStatus({ ...statusRef.current, phase: 'saving', message: 'Changes waiting to save…' })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { timerRef.current = null; void runSaveLoop() }, AUTOSAVE_DELAY_MS)
  }), [publishStatus, runSaveLoop, runtime])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const controller = useMemo<ProjectController>(() => ({
    getStatus: () => statusRef.current,
    listProjects: async () => (await convex.query(api.projects.list, {})).map(toProjectSummary),
    createProject: async (input: CreateProjectInput) => {
      const key = input.projectKey ?? createProjectKey(input.name)
      const workspace = createBlankCampaignState(input.name, input.objective)
      const project = await convex.mutation(api.projects.ensure, { projectKey: key, name: input.name, workspace, idempotencyKey: input.idempotencyKey })
      if (!project) throw new Error('Convex did not return the created project.')
      return toProjectSummary(project)
    },
    openProject: (key) => { window.location.assign(`/projects/${encodeURIComponent(key)}`) },
    flush,
    createVersion: async (label, actor, idempotencyKey) => {
      await flush()
      const revision = headRevisionRef.current
      if (revision === null) throw new Error('The project is not ready.')
      const version = await createVersionMutation({ projectKey, expectedHeadRevision: revision, label, actor, idempotencyKey })
      if (!version) throw new Error('Convex did not return the created version.')
      return { id: version._id, label: version.label, kind: version.kind, actor: version.actor, workspaceVersion: version.workspaceVersion, headRevision: version.headRevision, createdAt: version.createdAt }
    },
    listVersions: async () => (await convex.query(api.projects.listVersions, { projectKey })).map((version) => ({ id: version.id, label: version.label, kind: version.kind, actor: version.actor, workspaceVersion: version.workspaceVersion, headRevision: version.headRevision, createdAt: version.createdAt })),
    restoreVersion: async (versionId, actor, idempotencyKey) => {
      await flush()
      const revision = headRevisionRef.current
      if (revision === null) throw new Error('The project is not ready.')
      const restored = await restoreVersionMutation({ projectKey, versionId: versionId as Id<'boardVersions'>, expectedHeadRevision: revision, actor, idempotencyKey })
      const nextState = restored.workspace as WorkspaceState
      suppressNextChangeRef.current = true
      runtime.replaceSnapshot(nextState)
      headRevisionRef.current = restored.headRevision
      savedWorkspaceVersionRef.current = restored.workspaceVersion
      const nextStatus: ProjectSaveStatus = { phase: 'saved', projectKey, headRevision: restored.headRevision, savedWorkspaceVersion: restored.workspaceVersion, lastSavedAt: restored.updatedAt, message: 'Version restored as a new project head' }
      publishStatus(nextStatus)
      return { state: nextState, status: nextStatus }
    },
    imageGeneration: {
      execute: async (input) => {
        await flush()
        return await executeImageGeneration({ projectKey, ...input })
      },
      markAwaitingReview: async (runKey, proposalIds, boardVersionAfter) => {
        const run = await markImageGenerationReview({ projectKey, runKey, proposalIds, boardVersionAfter })
        await flush()
        return run as ImageGenerationRun
      },
      getRun: async (runKey) => await convex.query(api.imageGeneration.getRun, { projectKey, runKey }) as ImageGenerationRun | null,
    },
    reviewerGrants: {
      create: async (input) => await createReviewerGrant({ projectKey, ...input }),
      validate: async (session, action) => {
        await convex.query(api.reviewerGrants.validateReview, {
          projectKey,
          grantKey: session.grantKey,
          creativeSessionId: session.creativeSessionId,
          reviewerSessionId: session.reviewerSessionId,
          action,
        })
      },
      authorizeCost: async (session, input) => {
        const authorization = await authorizeReviewerCost({
          projectKey,
          grantKey: session.grantKey,
          creativeSessionId: session.creativeSessionId,
          reviewerSessionId: session.reviewerSessionId,
          ...input,
        })
        return {
          accepted: true,
          quoteFingerprint: authorization.quoteFingerprint,
          generationIdempotencyKey: authorization.generationIdempotencyKey,
          proposerSessionId: session.creativeSessionId,
          reviewerSessionId: session.reviewerSessionId,
          expiresAt: authorization.expiresAt,
        }
      },
      revoke: async (grantKey) => { await revokeReviewerGrant({ projectKey, grantKey }) },
    },
  }), [authorizeReviewerCost, convex, createReviewerGrant, createVersionMutation, executeImageGeneration, flush, markImageGenerationReview, projectKey, publishStatus, restoreVersionMutation, revokeReviewerGrant, runtime])

  return { runtime, project: remoteProject, status, controller, isReady: hydratedRef.current && remoteProject !== null && remoteProject !== undefined }
}
