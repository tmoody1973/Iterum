'use client'

import { Layers3, X } from 'lucide-react'

import type { WorkspaceState } from '../../lib/domain/types'
import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import { BoardOutline } from './board-outline'

export function LayersPanel({ snapshot, runtime, selectedId, onSelect, onClose }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime; selectedId: string | null; onSelect: (id: string | null) => void; onClose: () => void }) {
  return <aside className="mechanical-side-panel layers-panel" id="mechanical-side-panel" aria-labelledby="layers-panel-title">
    <header className="mechanical-panel-heading">
      <span><Layers3 aria-hidden="true" /><strong id="layers-panel-title">Layers</strong></span>
      <button type="button" aria-label="Close Layers" onClick={onClose}><X aria-hidden="true" /></button>
    </header>
    <BoardOutline snapshot={snapshot} runtime={runtime} selectedId={selectedId} onSelect={onSelect} />
  </aside>
}
