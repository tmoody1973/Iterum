'use client'

import { LockKeyhole, Move, MousePointer2, ScanLine } from 'lucide-react'

import type { ActiveTool } from '../../stores/ui-store'

const tools: Array<{ id: ActiveTool; label: string; Icon: typeof MousePointer2 }> = [
  { id: 'select', label: 'Select', Icon: MousePointer2 },
  { id: 'crop', label: 'Crop', Icon: ScanLine },
  { id: 'annotate', label: 'Mark', Icon: Move },
]

export function MechanicalToolbar({ activeTool, onToolChange }: { activeTool: ActiveTool; onToolChange: (tool: ActiveTool) => void }) {
  return <div className="mechanical-toolbar" aria-label="Mechanical tools">
    {tools.map(({ id, label, Icon }) => <button key={id} type="button" className={activeTool === id ? 'is-active' : ''} onClick={() => onToolChange(id)}><Icon aria-hidden="true" />{label}</button>)}
    <span className="mechanical-lock-note"><LockKeyhole aria-hidden="true" />References locked</span>
  </div>
}
