import { applyWorkspaceCommand } from './commands'
import type { CommandResult, WorkspaceCommand, WorkspaceState } from './types'

export interface WorkspaceRuntime {
  getSnapshot(): WorkspaceState
  subscribe(listener: () => void): () => void
  dispatch(command: WorkspaceCommand): CommandResult
}

export function createWorkspaceRuntime(initialState: WorkspaceState): WorkspaceRuntime {
  let snapshot = initialState
  const listeners = new Set<() => void>()

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    dispatch(command) {
      const result = applyWorkspaceCommand(snapshot, command)
      if (result.ok) {
        snapshot = result.state
        listeners.forEach((listener) => listener())
      }
      return result
    },
  }
}
