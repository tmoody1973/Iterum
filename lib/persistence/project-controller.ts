import type { WorkspaceState } from '../domain/types'

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

export interface ProjectController {
  getStatus(): ProjectSaveStatus
  listProjects(): Promise<ProjectSummary[]>
  createProject(input: CreateProjectInput): Promise<ProjectSummary>
  openProject(projectKey: string): void
  flush(): Promise<ProjectSaveStatus>
  createVersion(label: string, actor: 'designer' | 'agent', idempotencyKey: string): Promise<ProjectVersionSummary>
  listVersions(): Promise<ProjectVersionSummary[]>
  restoreVersion(versionId: string, actor: 'designer' | 'agent', idempotencyKey: string): Promise<{ state: WorkspaceState; status: ProjectSaveStatus }>
}
