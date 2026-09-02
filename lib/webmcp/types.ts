import type { ActionReceipt, WorkspaceState } from '../domain/types'

export type ToolFailure = {
  ok: false
  schemaVersion: '1.0'
  campaignId: string
  boardId: string
  boardVersion: number
  error: { code: string; message: string; retryable: boolean; details?: Record<string, unknown> }
}

export type ToolSuccess<T> = {
  ok: true
  schemaVersion: '1.0'
  campaignId: string
  boardId: string
  boardVersion: number
  receipt?: ActionReceipt
  data: T
  summary: string
  ui: { updated: boolean }
}

export type ToolResponse<T> = ToolSuccess<T> | ToolFailure

export type RegisteredTools = { controller: AbortController; count: number }

export function failure(state: WorkspaceState, code: string, message: string, retryable = false, details?: Record<string, unknown>): ToolFailure {
  return { ok: false, schemaVersion: '1.0', campaignId: state.campaign.id, boardId: state.campaign.boardId, boardVersion: state.version, error: { code, message, retryable, details } }
}

export function success<T>(state: WorkspaceState, data: T, summary: string, receipt?: ActionReceipt, uiUpdated = Boolean(receipt)): ToolSuccess<T> {
  return { ok: true, schemaVersion: '1.0', campaignId: state.campaign.id, boardId: state.campaign.boardId, boardVersion: state.version, receipt, data, summary, ui: { updated: uiUpdated } }
}
