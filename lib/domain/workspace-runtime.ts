import { applyWorkspaceCommand } from './commands'
import type { CommandResult, WorkspaceCommand, WorkspaceState } from './types'

export interface WorkspaceRuntime {
  getSnapshot(): WorkspaceState
  subscribe(listener: () => void): () => void
  dispatch(command: WorkspaceCommand): CommandResult
  replaceSnapshot(nextSnapshot: WorkspaceState): void
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
    replaceSnapshot(nextSnapshot) {
      if (nextSnapshot === snapshot) return
      snapshot = nextSnapshot
      listeners.forEach((listener) => listener())
    },
    dispatch(command) {
      const result = applyWorkspaceCommand(snapshot, command)
      if (result.ok && result.state !== snapshot) {
        snapshot = result.state
        listeners.forEach((listener) => listener())
      }
      return result
    },
  }
}
