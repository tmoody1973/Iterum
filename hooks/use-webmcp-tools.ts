'use client'

import { useEffect } from 'react'

import { registerIterumTools } from '../lib/webmcp/register-tools'
import type { WorkspaceRuntime } from '../lib/domain/workspace-runtime'
import type { ProjectController } from '../lib/persistence/project-controller'
import type { ReviewerGrantSession } from '../lib/persistence/project-controller'
import type { WebMcpAgentSession } from '../lib/webmcp/register-review-tools'
import { useUiStore } from '../stores/ui-store'

export function useWebMcpTools(runtime: WorkspaceRuntime, projectController?: ProjectController, reviewerGrant?: ReviewerGrantSession) {
  const setStatus = useUiStore((state) => state.setWebMcpStatus)
  useEffect(() => {
    const controller = new AbortController()
    if (!document.modelContext) { setStatus('preview'); return () => controller.abort() }
    let active = true
    const agentSession: WebMcpAgentSession = reviewerGrant
      ? { role: 'reviewer', sessionId: reviewerGrant.reviewerSessionId, reviewerGrant }
      : { role: 'creative', sessionId: (() => {
        let existing: string | null = null
        try { existing = window.sessionStorage?.getItem('iterum:webmcp:creative-session') ?? null } catch { /* storage is unavailable in some embedded/test contexts */ }
        const id = existing ?? `creative_${crypto.randomUUID()}`
        try { window.sessionStorage?.setItem('iterum:webmcp:creative-session', id) } catch { /* keep the in-memory session */ }
        try { window.localStorage?.setItem('iterum:webmcp:creative-session:review-handoff', id) } catch { /* setup will report a missing handoff if storage is blocked */ }
        return id
      })() }
    const viewportController = {
      getViewport: () => useUiStore.getState().boardViewport,
      getViewportSize: () => useUiStore.getState().boardViewportSize,
      setViewport: (viewport: ReturnType<typeof useUiStore.getState>['boardViewport'], mode: 'fit' | 'custom' = 'custom') => useUiStore.getState().setBoardViewport(viewport, mode),
    }
    const reviewUi = {
      previewLayoutProposal: (id: string | null) => useUiStore.getState().setPreviewLayoutProposal(id),
      openReview: () => { useUiStore.getState().setActiveRightTab('review'); useUiStore.getState().setReviewDrawerOpen(true) },
    }
    const presentationUi = {
      getDisplayState: () => {
        const state = useUiStore.getState()
        return { mode: state.boardDisplayMode, selectedItemId: state.selectedBoardItemId, previewProposalId: state.previewLayoutProposalId, workspaceMode: state.activeWorkspaceMode, activeTool: state.activeTool, drawers: { brief: state.isBriefDrawerOpen, review: state.isReviewDrawerOpen } }
      },
      setDisplayMode: (mode: ReturnType<typeof useUiStore.getState>['boardDisplayMode']) => useUiStore.getState().setBoardDisplayMode(mode),
      preparePresentation: () => useUiStore.setState({ boardDisplayMode: 'presentation', selectedBoardItemId: null, previewLayoutProposalId: null, activeWorkspaceMode: 'mechanical', activeTool: 'select', isBriefDrawerOpen: false, isReviewDrawerOpen: false }),
    }
    registerIterumTools(runtime, controller, viewportController, reviewUi, presentationUi, projectController, agentSession).then((registered) => { if (active) setStatus(registered ? 'ready' : 'preview') }).catch(() => { if (active && !controller.signal.aborted) setStatus('error') })
    return () => { active = false; controller.abort() }
  }, [projectController, reviewerGrant, runtime, setStatus])
}
