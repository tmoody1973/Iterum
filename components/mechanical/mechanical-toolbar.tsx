'use client'

import { Focus, LockKeyhole, Move, MousePointer2, Palette, ScanLine, Type, ZoomIn, ZoomOut } from 'lucide-react'

import { boundsForItems, fitBounds, viewportCenter, viewportFromCenter, zoomAtPoint } from '../../lib/board/viewport'
import type { BoardItem } from '../../lib/domain/types'
import type { ActiveTool } from '../../stores/ui-store'
import { useUiStore } from '../../stores/ui-store'

const tools: Array<{ id: ActiveTool; label: string; Icon: typeof MousePointer2 }> = [
  { id: 'select', label: 'Select', Icon: MousePointer2 },
  { id: 'crop', label: 'Crop', Icon: ScanLine },
  { id: 'color', label: 'Color', Icon: Palette },
  { id: 'type', label: 'Type', Icon: Type },
  { id: 'annotate', label: 'Mark', Icon: Move },
]

export function MechanicalToolbar({ activeTool, onToolChange, boardItems }: { activeTool: ActiveTool; onToolChange: (tool: ActiveTool) => void; boardItems: BoardItem[] }) {
  const viewport = useUiStore((state) => state.boardViewport)
  const size = useUiStore((state) => state.boardViewportSize)
  const setViewport = useUiStore((state) => state.setBoardViewport)
  const available = size.width > 0 && size.height > 0
  const centerPoint = { x: size.width / 2, y: size.height / 2 }
  const zoom = (factor: number) => setViewport(zoomAtPoint(viewport, viewport.scale * factor, centerPoint), 'custom')
  const actualSize = () => setViewport(viewportFromCenter(viewportCenter(viewport, size), 1, size), 'custom')
  const fit = () => setViewport(fitBounds(boundsForItems(boardItems, true), size), 'fit')
  return <div className="mechanical-toolbar" aria-label="Mechanical tools">
    {tools.map(({ id, label, Icon }) => <button key={id} type="button" className={activeTool === id ? 'is-active' : ''} onClick={() => onToolChange(id)}><Icon aria-hidden="true" />{label}</button>)}
    <span className="mechanical-viewport-controls" aria-label="Board view controls">
      <button type="button" disabled={!available} onClick={() => zoom(1.2)} aria-label="Zoom in"><ZoomIn aria-hidden="true" /></button>
      <button type="button" disabled={!available} onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><ZoomOut aria-hidden="true" /></button>
      <button type="button" disabled={!available} onClick={actualSize} aria-label="Set board zoom to 100 percent">100%</button>
      <button type="button" disabled={!available} onClick={fit} aria-label="Fit board"><Focus aria-hidden="true" />Fit</button>
      <output aria-label="Current board zoom">{Math.round(viewport.scale * 100)}%</output>
    </span>
    <span className="mechanical-lock-note"><LockKeyhole aria-hidden="true" />References locked</span>
  </div>
}
