'use client'

import { useUiStore } from '../stores/ui-store'
import type { WorkspaceMode } from '../stores/ui-store'
import { WebMcpStatus } from './webmcp-status'
import type { ProjectSaveStatus } from '../lib/persistence/project-controller'

const modes: Array<{ id: WorkspaceMode; label: string }> = [
  { id: 'mechanical', label: 'Mechanical' },
  { id: 'layers', label: 'Layers' },
  { id: 'history', label: 'History' },
]

export function BottomModeBar({ version, campaignName, projectStatus }: { version: number; campaignName: string; projectStatus?: ProjectSaveStatus }) {
  const activeTool = useUiStore((state) => state.activeTool)
  const activeWorkspaceMode = useUiStore((state) => state.activeWorkspaceMode)
  const setActiveWorkspaceMode = useUiStore((state) => state.setActiveWorkspaceMode)
  const versionLabel = `V${String(version).padStart(2, '0')}`
  return (
    <footer className="bottom-mode-bar" aria-label="Workspace modes">
      <p className="crumbs"><a href="/projects">Projects</a> <span>›</span> {campaignName} <span>›</span> {versionLabel}</p>
      <nav aria-label="Production modes">{modes.map((mode) => <button id={`workspace-mode-${mode.id}`} type="button" className={mode.id === activeWorkspaceMode ? 'is-active' : ''} aria-pressed={mode.id === activeWorkspaceMode} aria-controls={mode.id === 'mechanical' ? undefined : 'mechanical-side-panel'} key={mode.id} onClick={() => setActiveWorkspaceMode(mode.id)}>{mode.label}</button>)}</nav>
      <div className="mode-status"><WebMcpStatus />{projectStatus && <span className={`cloud-save-status is-${projectStatus.phase}`} title={projectStatus.message}>Cloud · {projectStatus.phase}</span>}<span>Tool: {activeTool}</span><span>{versionLabel}</span></div>
    </footer>
  )
}
