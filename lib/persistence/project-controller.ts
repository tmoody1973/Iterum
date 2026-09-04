import type { WorkspaceState } from '../domain/types'
import type { ImageGenerationController } from '../image-generation/types'

export type ProjectSavePhase = 'loading' | 'ready' | 'saving' | 'saved' | 'conflict' | 'error'

export interface ProjectSaveStatus {
  phase: ProjectSavePhase
  projectKey: string
  headRevision: number | null
  savedWorkspaceVersion: number | null
  lastSavedAt: number | null
  message: string
}

export interface ProjectSummary {
  id: string
  projectKey: string
  name: string
  campaignId: string
  boardId: string
  workspaceVersion: number
  headRevision: number
  createdAt: number
  updatedAt: number
}

export interface ProjectVersionSummary {
  id: string
  label: string
  kind: 'initial' | 'snapshot' | 'restore'
  actor: 'designer' | 'agent' | 'system'
  workspaceVersion: number
  headRevision: number
  createdAt: number
}

export interface CreateProjectInput {
  name: string
  objective: string
  projectKey?: string
  idempotencyKey: string
}

export interface ReviewerGrantSession {
  projectKey: string
  grantKey: string
  creativeSessionId: string
  reviewerSessionId: string
  costCeilingUsd: number
  expiresAt: number
}

export interface CreateReviewerGrantInput {
  creativeSessionId: string
  reviewerSessionId: string
  expiresInMinutes: number
  costCeilingUsd: number
}

export interface ReviewerGrantController {
  create(input: CreateReviewerGrantInput): Promise<ReviewerGrantSession>
  validate(session: ReviewerGrantSession, action: string): Promise<void>
  authorizeCost(session: ReviewerGrantSession, input: {
    quoteFingerprint: string
    generationIdempotencyKey: string
    estimatedOutputUsd: number
    rationale: string
  }): Promise<{
    accepted: true
    quoteFingerprint: string
    generationIdempotencyKey: string
    proposerSessionId: string
    reviewerSessionId: string
    expiresAt: number
  }>
  revoke(grantKey: string): Promise<void>
}

export interface ProjectCatalogController {
  listProjects(): Promise<ProjectSummary[]>
  createProject(input: CreateProjectInput): Promise<ProjectSummary>
  openProject(projectKey: string): void
}

export interface ProjectController extends ProjectCatalogController {
  getStatus(): ProjectSaveStatus
  flush(): Promise<ProjectSaveStatus>
  createVersion(label: string, actor: 'designer' | 'agent', idempotencyKey: string): Promise<ProjectVersionSummary>
  listVersions(): Promise<ProjectVersionSummary[]>
  restoreVersion(versionId: string, actor: 'designer' | 'agent', idempotencyKey: string): Promise<{ state: WorkspaceState; status: ProjectSaveStatus }>
  imageGeneration?: ImageGenerationController
  reviewerGrants?: ReviewerGrantController
}

export function toProjectSummary(project: {
  _id?: string
  id?: string
  projectKey: string
  name: string
  campaignId: string
  boardId: string
  workspaceVersion: number
  headRevision: number
  createdAt: number
  updatedAt: number
}): ProjectSummary {
  const id = project._id ?? project.id
  if (!id) throw new Error('Convex returned a project without an identifier.')
  return { id, projectKey: project.projectKey, name: project.name, campaignId: project.campaignId, boardId: project.boardId, workspaceVersion: project.workspaceVersion, headRevision: project.headRevision, createdAt: project.createdAt, updatedAt: project.updatedAt }
}
