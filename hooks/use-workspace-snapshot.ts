'use client'

import { useSyncExternalStore } from 'react'

import { demoRuntime } from '../lib/domain/demo-runtime'
import type { WorkspaceRuntime } from '../lib/domain/workspace-runtime'
import type { WorkspaceState } from '../lib/domain/types'

export function useWorkspaceSnapshot(runtime: WorkspaceRuntime = demoRuntime): WorkspaceState {
  return useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
}
