'use client'

import { useUiStore } from '../stores/ui-store'
import { WebMcpStatus } from './webmcp-status'

const modes = ['Mechanical', 'Layers', 'Type', 'Color', 'Notes', 'History']

export function BottomModeBar({ version }: { version: number }) {
  const activeTool = useUiStore((state) => state.activeTool)
  const versionLabel = `V${String(version).padStart(2, '0')}`
  return (
    <footer className="bottom-mode-bar" aria-label="Workspace modes">
      <p className="crumbs">Projects <span>›</span> Static Bloom <span>›</span> {versionLabel}</p>
      <nav aria-label="Production modes">{modes.map((mode) => <button type="button" className={mode === 'Mechanical' ? 'is-active' : ''} key={mode}>{mode}</button>)}</nav>
      <div className="mode-status"><WebMcpStatus /><span>Tool: {activeTool}</span><span>Saved</span><span>10:42 AM</span></div>
    </footer>
  )
}
