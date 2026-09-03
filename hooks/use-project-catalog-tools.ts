'use client'

import { useEffect } from 'react'

import type { ProjectCatalogController } from '../lib/persistence/project-controller'
import { registerProjectCatalogTools } from '../lib/webmcp/register-project-tools'
import { useUiStore } from '../stores/ui-store'

export function useProjectCatalogTools(projects: ProjectCatalogController) {
  const setStatus = useUiStore((state) => state.setWebMcpStatus)
  useEffect(() => {
    const controller = new AbortController()
    if (!document.modelContext) { setStatus('preview'); return () => controller.abort() }
    let active = true
    registerProjectCatalogTools(projects, controller).then((registered) => { if (active) setStatus(registered ? 'ready' : 'preview') }).catch(() => { if (active && !controller.signal.aborted) setStatus('error') })
    return () => { active = false; controller.abort() }
  }, [projects, setStatus])
}
