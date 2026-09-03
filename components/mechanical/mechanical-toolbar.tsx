'use client'

import { Focus, Grid3X3, LockKeyhole, LockOpen, Move, MousePointer2, Palette, ScanLine, Type, View, Wrench, ZoomIn, ZoomOut } from 'lucide-react'

import { boundsForItems, fitBounds, viewportCenter, viewportFromCenter, zoomAtPoint } from '../../lib/board/viewport'
import type { BoardItem } from '../../lib/domain/types'
import type { ActiveTool } from '../../stores/ui-store'
import { useUiStore } from '../../stores/ui-store'

const tools: Array<{ id: ActiveTool; label: string; Icon: typeof MousePointer2 }> = [
  { id: 'select', label: 'Select', Icon: MousePointer2 },
  { id: 'crop', label: 'Crop', Icon: ScanLine },
  { id: 'color', label: 'Color', Icon: Palette },
  { id: 'type', label: 'Type', Icon: Type },
  { id: 'organize', label: 'Organize', Icon: Grid3X3 },
  { id: 'annotate', label: 'Mark', Icon: Move },
]

export function MechanicalToolbar({ activeTool, onToolChange, boardItems, selectedItem, onToggleSelectedLock }: { activeTool: ActiveTool; onToolChange: (tool: ActiveTool) => void; boardItems: BoardItem[]; selectedItem?: BoardItem; onToggleSelectedLock: () => void }) {
  const viewport = useUiStore((state) => state.boardViewport)
  const size = useUiStore((state) => state.boardViewportSize)
  const setViewport = useUiStore((state) => state.setBoardViewport)
  const displayMode = useUiStore((state) => state.boardDisplayMode)
  const setDisplayMode = useUiStore((state) => state.setBoardDisplayMode)
  const available = size.width > 0 && size.height > 0
  const centerPoint = { x: size.width / 2, y: size.height / 2 }
  const zoom = (factor: number) => setViewport(zoomAtPoint(viewport, viewport.scale * factor, centerPoint), 'custom')
  const actualSize = () => setViewport(viewportFromCenter(viewportCenter(viewport, size), 1, size), 'custom')
  const fit = () => setViewport(fitBounds(boundsForItems(boardItems, true), size), 'fit')
  return <div className="mechanical-toolbar" aria-label="Mechanical tools">
    <span className="board-display-controls" aria-label="Board display mode">
      <button type="button" className={displayMode === 'working' ? 'is-active' : ''} aria-pressed={displayMode === 'working'} onClick={() => setDisplayMode('working')}><Wrench aria-hidden="true" />Working</button>
      <button type="button" className={displayMode === 'presentation' ? 'is-active' : ''} aria-pressed={displayMode === 'presentation'} onClick={() => setDisplayMode('presentation')}><View aria-hidden="true" />Present</button>
    </span>
    {displayMode === 'working' && tools.map(({ id, label, Icon }) => <button key={id} type="button" className={activeTool === id ? 'is-active' : ''} onClick={() => onToolChange(id)}><Icon aria-hidden="true" />{label}</button>)}
    <span className="mechanical-viewport-controls" aria-label="Board view controls">
      <button type="button" disabled={!available} onClick={() => zoom(1.2)} aria-label="Zoom in"><ZoomIn aria-hidden="true" /></button>
      <button type="button" disabled={!available} onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><ZoomOut aria-hidden="true" /></button>
      <button type="button" disabled={!available} onClick={actualSize} aria-label="Set board zoom to 100 percent">100%</button>
      <button type="button" disabled={!available} onClick={fit} aria-label="Fit board"><Focus aria-hidden="true" />Fit</button>
      <output aria-label="Current board zoom">{Math.round(viewport.scale * 100)}%</output>
    </span>
    {displayMode === 'working' && <button type="button" className="mechanical-item-lock" disabled={!selectedItem} onClick={onToggleSelectedLock} aria-label={selectedItem ? `${selectedItem.locked ? 'Unlock' : 'Lock'} ${selectedItem.title}` : 'Select an item to change its lock'}>{selectedItem?.locked ? <LockOpen aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}{selectedItem ? selectedItem.locked ? 'Unlock' : 'Lock' : 'Select to lock'}</button>}
  </div>
}
