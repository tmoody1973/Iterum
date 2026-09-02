'use client'

import type { KeyboardEvent } from 'react'
import { LockKeyhole, LockOpen, Move } from 'lucide-react'

import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { BoardItem, WorkspaceState } from '../../lib/domain/types'

const STEP = 10

function sourceLabel(item: BoardItem) {
  if (item.kind === 'note') return 'Direction Draft note'
  if (item.kind === 'type-specimen') return item.attribution ?? 'Approved Iterum type direction'
  if (item.kind === 'campaign-proof') return 'Canonical campaign proof'
  if (item.kind === 'color-strip') return 'Canonical campaign palette'
  return item.sourceUrl === 'local-demo' ? 'Iterum synthetic reference' : item.sourceUrl ?? 'Unrecorded source'
}

export function BoardOutline({ snapshot, runtime, selectedId, onSelect }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const moveItem = (item: BoardItem, x: number, y: number) => runtime.dispatch({
    type: 'move-board-item', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId,
    expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', itemId: item.id, position: { x, y },
  })
  const resizeItem = (item: BoardItem, amount: number) => runtime.dispatch({
    type: 'resize-board-item', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId,
    expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', itemId: item.id,
    width: Math.max(80, item.width + amount), height: Math.max(item.kind === 'color-strip' ? 16 : 60, item.height + amount),
  })
  const setLocked = (item: BoardItem, locked: boolean) => runtime.dispatch({
    type: 'set-board-item-lock', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId,
    expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', itemId: item.id, locked,
  })
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, item: BoardItem) => {
    const delta = event.key === 'ArrowLeft' ? [-STEP, 0] : event.key === 'ArrowRight' ? [STEP, 0] : event.key === 'ArrowUp' ? [0, -STEP] : event.key === 'ArrowDown' ? [0, STEP] : null
    if (!delta || item.locked) return
    event.preventDefault()
    moveItem(item, item.position.x + delta[0], item.position.y + delta[1])
  }

  return <section className="board-outline" aria-label="Board outline">
    <div className="board-outline-heading"><h2>Board outline</h2><span>{snapshot.boardItems.length} items</span></div>
    <p className="board-outline-help">Every visible content object is listed here. Unlock an item to move it by drag or arrow keys and resize it.</p>
    <ol>
      {snapshot.boardItems.map((item) => <li key={item.id} className={selectedId === item.id ? 'is-selected' : ''}>
        <button type="button" aria-label={`Select ${item.title}`} aria-pressed={selectedId === item.id} onClick={() => onSelect(item.id)} onKeyDown={(event) => onKeyDown(event, item)}>
          <span className="outline-title">{item.title}</span>
          <span className="outline-meta">X {item.position.x} · Y {item.position.y} · {item.width} × {item.height}px</span>
          {item.kind === 'type-specimen' && <span className="outline-meta">Typeface: {item.typeRole === 'headline' ? snapshot.typeDirection?.headline.family ?? 'Awaiting direction' : snapshot.typeDirection?.body.family ?? 'Awaiting direction'}</span>}
          {item.groupLabel && <span className="outline-meta">Group: {item.groupLabel}</span>}
          <span className="outline-source">Source: {sourceLabel(item)}</span>
          <span className="outline-actions">{item.locked ? <><LockKeyhole aria-hidden="true" />Locked · inspect/select only</> : <><Move aria-hidden="true" />Arrow keys move · size controls available</>}</span>
        </button><div className="outline-controls">
          {item.locked ? <><button type="button" disabled aria-label={`Resize ${item.title} larger`}>Resize unavailable</button><button type="button" onClick={() => setLocked(item, false)} aria-label={`Unlock ${item.title}`}><LockOpen aria-hidden="true" />Unlock</button></> : <><button type="button" onClick={() => resizeItem(item, -20)} aria-label={`Decrease ${item.title} size`}>− Size</button><button type="button" onClick={() => resizeItem(item, 20)} aria-label={`Increase ${item.title} size`}>+ Size</button><button type="button" onClick={() => setLocked(item, true)} aria-label={`Lock ${item.title}`}><LockKeyhole aria-hidden="true" />Lock</button></>}
        </div>
      </li>)}
    </ol>
  </section>
}
