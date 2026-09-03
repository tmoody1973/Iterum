'use client'

import type { RefObject } from 'react'

import type { ProjectController, ProjectSaveStatus } from '../lib/persistence/project-controller'
import { useUiStore } from '../stores/ui-store'
import { ProjectSwitcher } from './persistence/project-switcher'

export function TopToolbar({ onOpenBrief, onOpenReview, briefExpanded, reviewExpanded, briefTriggerRef, reviewTriggerRef, campaignName, projectController, projectStatus }: {
  onOpenBrief: () => void
  onOpenReview: () => void
  briefExpanded: boolean
  reviewExpanded: boolean
  briefTriggerRef: RefObject<HTMLButtonElement | null>
  reviewTriggerRef: RefObject<HTMLButtonElement | null>
  campaignName: string
  projectController?: ProjectController
  projectStatus?: ProjectSaveStatus
}) {
  const activeWorkspaceMode = useUiStore((state) => state.activeWorkspaceMode)

  return (
    <header className="top-toolbar" aria-label="Iterum">
      <div className="wordmark" aria-label="Iterum">ITERUM</div>
      <span className="toolbar-divider" aria-hidden="true" />
      {projectController && projectStatus
        ? <ProjectSwitcher currentProjectName={campaignName} controller={projectController} status={projectStatus} />
        : <p className="toolbar-title">Paste-up proofing desk</p>}
      <div className="drawer-controls" aria-label="Workspace panels">
        <button ref={briefTriggerRef} type="button" aria-controls="campaign-job-ticket" aria-expanded={briefExpanded} onClick={onOpenBrief}>Brief</button>
        <button ref={reviewTriggerRef} type="button" aria-controls="review-tray" aria-expanded={reviewExpanded} onClick={onOpenReview}>Review tray</button>
      </div>
      <div className="view-readout"><span>View</span> {activeWorkspaceMode === 'mechanical' ? 'Mechanical' : activeWorkspaceMode === 'layers' ? 'Layers' : 'History'}</div>
    </header>
  )
}
