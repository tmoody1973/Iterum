'use client'

import Link from 'next/link'
import { ArrowRight, Check, ChevronDown, Cloud, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ProjectController, ProjectSaveStatus, ProjectSummary } from '../../lib/persistence/project-controller'

function statusLabel(status: ProjectSaveStatus) {
  if (status.phase === 'saved' || status.phase === 'ready') return 'Cloud saved'
  if (status.phase === 'saving') return 'Saving'
  if (status.phase === 'loading') return 'Opening'
  if (status.phase === 'conflict') return 'Save conflict'
  return 'Cloud unavailable'
}

export function ProjectSwitcher({ currentProjectName, controller, status }: {
  currentProjectName: string
  controller: ProjectController
  status: ProjectSaveStatus
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [error, setError] = useState('')
  const [openingProjectKey, setOpeningProjectKey] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const loadProjects = useCallback(async () => {
    setError('')
    try {
      setProjects(await controller.listProjects())
    } catch (loadError) {
      setProjects([])
      setError(loadError instanceof Error ? loadError.message : 'Cloud projects could not be loaded.')
    }
  }, [controller])

  useEffect(() => {
    if (!isOpen) return
    void loadProjects()
    requestAnimationFrame(() => closeRef.current?.focus())

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, loadProjects])

  const close = () => {
    setIsOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const openProject = (projectKey: string) => {
    if (projectKey === status.projectKey) {
      close()
      return
    }
    setOpeningProjectKey(projectKey)
    controller.openProject(projectKey)
  }

  const recentProjects = projects?.slice(0, 6) ?? []

  return <div className="project-switcher" ref={rootRef}>
    <button
      ref={triggerRef}
      type="button"
      className="project-switcher-trigger"
      aria-expanded={isOpen}
      aria-controls="project-switcher-panel"
      aria-haspopup="dialog"
      onClick={() => setIsOpen((value) => !value)}
    >
      <span className="project-switcher-current"><small>Project</small><strong>{currentProjectName}</strong></span>
      <span className={`project-switcher-status is-${status.phase}`} title={status.message}><Cloud aria-hidden="true" /><span>{statusLabel(status)}</span></span>
      <ChevronDown className={isOpen ? 'is-open' : ''} aria-hidden="true" />
    </button>

    {isOpen && <section id="project-switcher-panel" className="project-switcher-panel" role="dialog" aria-label="Switch cloud project" aria-modal="false">
      <header><div><span>Iterum cloud</span><h2>Recent projects</h2></div><button ref={closeRef} type="button" onClick={close} aria-label="Close project switcher"><X aria-hidden="true" /></button></header>
      <div className="project-switcher-list">
        {projects === null && <p className="project-switcher-message" role="status">Loading cloud projects…</p>}
        {error && <div className="project-switcher-message is-error" role="alert"><p>{error}</p><button type="button" onClick={() => void loadProjects()}>Try again</button></div>}
        {!error && projects !== null && recentProjects.length === 0 && <p className="project-switcher-message">No projects yet.</p>}
        {!error && recentProjects.map((project) => {
          const isCurrent = project.projectKey === status.projectKey
          return <button className={isCurrent ? 'is-current' : ''} type="button" key={project.id} onClick={() => openProject(project.projectKey)} disabled={openingProjectKey !== null}>
            <span><strong>{project.name}</strong><small>Board V{String(project.workspaceVersion).padStart(2, '0')} · revision {project.headRevision}</small></span>
            {isCurrent ? <span className="project-current-mark"><Check aria-hidden="true" />Open</span> : <ArrowRight aria-hidden="true" />}
          </button>
        })}
      </div>
      <footer><Link href="/projects">All projects <span>&amp; create new</span><ArrowRight aria-hidden="true" /></Link></footer>
    </section>}
  </div>
}
