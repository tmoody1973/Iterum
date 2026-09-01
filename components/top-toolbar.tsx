'use client'

import { useUiStore } from '../stores/ui-store'

const tools = [
  ['select', 'Select'],
  ['crop', 'Crop'],
  ['color', 'Color'],
  ['type', 'Type'],
  ['annotate', 'Annotate'],
] as const

export function TopToolbar() {
  const activeTool = useUiStore((state) => state.activeTool)
  const setActiveTool = useUiStore((state) => state.setActiveTool)

  return (
    <header className="top-toolbar" aria-label="Iterum">
      <div className="wordmark" aria-label="Iterum">ITERUM</div>
      <span className="toolbar-divider" aria-hidden="true" />
      <p className="toolbar-title">Paste-up proofing desk</p>
      <nav className="tool-list" aria-label="Mechanical tools">
        {tools.map(([id, label]) => (
          <button
            className={activeTool === id ? 'tool-button is-active' : 'tool-button'}
            key={id}
            type="button"
            aria-pressed={activeTool === id}
            onClick={() => setActiveTool(id)}
          >
            <span className={`tool-glyph tool-glyph--${id}`} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="view-readout"><span>View</span> Mechanical</div>
    </header>
  )
}
