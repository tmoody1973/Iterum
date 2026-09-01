'use client'

import { useEffect } from 'react'

import { registerIterumTools } from '../lib/webmcp/register-tools'
import type { WorkspaceRuntime } from '../lib/domain/workspace-runtime'
import { useUiStore } from '../stores/ui-store'

export function useWebMcpTools(runtime: WorkspaceRuntime) {
  const setStatus = useUiStore((state) => state.setWebMcpStatus)
  useEffect(() => {
    const controller = new AbortController()
    if (!document.modelContext) { setStatus('preview'); return () => controller.abort() }
    let active = true
    registerIterumTools(runtime, controller).then((registered) => { if (active) setStatus(registered ? 'ready' : 'preview') }).catch(() => { if (active && !controller.signal.aborted) setStatus('error') })
    return () => { active = false; controller.abort() }
  }, [runtime, setStatus])
}
