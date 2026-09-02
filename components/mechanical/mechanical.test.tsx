import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createDemoWorkspaceState } from '../../lib/domain/demo-data'
import { createWorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import { useUiStore } from '../../stores/ui-store'
import { BoardOutline } from './board-outline'
import { restoreNodeFromItem, restoreNodeFromRuntime } from './mechanical-canvas'
import { referenceFilename, referenceSourceClass } from './reference-node'

function renderOutline() {
  const runtime = createWorkspaceRuntime(createDemoWorkspaceState())
  const select = (id: string | null) => useUiStore.getState().selectBoardItem(id)
  render(<BoardOutline snapshot={runtime.getSnapshot()} runtime={runtime} selectedId={null} onSelect={select} />)
  return runtime
}

afterEach(() => cleanup())

describe('mechanical DOM mirror', () => {
  it('lists every canvas object and gives the three protected references explicit unlock controls', () => {
    renderOutline()
    expect(screen.getAllByRole('button', { name: /^unlock /i })).toHaveLength(3)
    expect(screen.getByRole('button', { name: /select static bloom campaign proof/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /select campaign color control strip/i })).toBeVisible()
    expect(screen.getAllByText(/source: iterum synthetic reference/i)).toHaveLength(3)
  })

  it('lets the designer lock a previously movable campaign proof', () => {
    const runtime = renderOutline()
    fireEvent.click(screen.getByRole('button', { name: /lock static bloom campaign proof/i }))
    expect(runtime.getSnapshot().boardItems.find((item) => item.id === 'campaign-proof-static-bloom')?.locked).toBe(true)
    expect(runtime.getSnapshot().receipts[0]).toMatchObject({ action: 'set-board-item-lock', actor: 'designer' })
  })

  it('updates transient UI selection from the outline', () => {
    renderOutline()
    fireEvent.click(screen.getByRole('button', { name: /select wet concrete/i }))
    expect(useUiStore.getState().selectedBoardItemId).toBe('reference-concrete')
  })

  it('dispatches keyboard movement for an unlocked item', () => {
    const initial = createDemoWorkspaceState()
    initial.boardItems[0] = { ...initial.boardItems[0], locked: false }
    const runtime = createWorkspaceRuntime(initial)
    render(<BoardOutline snapshot={runtime.getSnapshot()} runtime={runtime} selectedId={null} onSelect={() => undefined} />)
    fireEvent.keyDown(screen.getByRole('button', { name: /select wet concrete/i }), { key: 'ArrowRight' })
    expect(runtime.getSnapshot().boardItems[0].position).toEqual({ x: 66, y: 62 })
  })

  it('dispatches keyboard resize controls for unlocked items and disables them for locked items', () => {
    const initial = createDemoWorkspaceState()
    initial.boardItems[0] = { ...initial.boardItems[0], locked: false }
    const runtime = createWorkspaceRuntime(initial)
    render(<BoardOutline snapshot={runtime.getSnapshot()} runtime={runtime} selectedId={null} onSelect={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /increase wet concrete.*size/i }))
    expect(runtime.getSnapshot().boardItems[0]).toMatchObject({ width: 296, height: 376 })
    expect(screen.getAllByRole('button', { name: /resize .* larger/i })).toHaveLength(2)
    screen.getAllByRole('button', { name: /resize .* larger/i }).forEach((button) => expect(button).toBeDisabled())
  })

  it('derives stable canvas provenance labels', () => {
    const [local, , typeStudy] = createDemoWorkspaceState().boardItems
    expect(referenceFilename(local)).toBe('REF_WET_CONCRETE.WEBP')
    expect(referenceSourceClass(local)).toBe('LOCAL SYNTHETIC')
    expect(referenceSourceClass({ ...typeStudy, kind: 'agent-addition' })).toBe('AGENT PROPOSAL')
  })

  it('restores canonical geometry after a rejected canvas mutation', () => {
    const item = createDemoWorkspaceState().boardItems[0]
    const calls: Array<[string, number]> = []
    const node = {
      x: (value: number) => { calls.push(['x', value]); return value }, y: (value: number) => { calls.push(['y', value]); return value },
      width: (value: number) => { calls.push(['width', value]); return value }, height: (value: number) => { calls.push(['height', value]); return value },
      scaleX: (value: number) => { calls.push(['scaleX', value]); return value }, scaleY: (value: number) => { calls.push(['scaleY', value]); return value },
      getLayer: () => ({ batchDraw: () => calls.push(['batchDraw', 1]) }), remove: () => undefined,
    }
    restoreNodeFromItem(node as never, item)
    expect(calls).toEqual([['x', 56], ['y', 62], ['width', 276], ['height', 356], ['scaleX', 1], ['scaleY', 1], ['batchDraw', 1]])
  })

  it('uses newer runtime geometry for a version-conflicted rollback', () => {
    const initial = createDemoWorkspaceState()
    const item = { ...initial.boardItems[0], locked: false }
    const runtime = createWorkspaceRuntime({ ...initial, boardItems: [item, ...initial.boardItems.slice(1)] })
    const accepted = runtime.dispatch({ type: 'move-board-item', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'newer-move', actor: 'designer', itemId: item.id, position: { x: 190, y: 210 } })
    expect(accepted.ok).toBe(true)
    const rejected = runtime.dispatch({ type: 'move-board-item', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'stale-move', actor: 'designer', itemId: item.id, position: { x: 500, y: 500 } })
    expect(rejected).toMatchObject({ ok: false, error: { code: 'VERSION_CONFLICT' } })
    const calls: Array<[string, number]> = []
    const node = {
      x: (value: number) => { calls.push(['x', value]); return value }, y: (value: number) => { calls.push(['y', value]); return value },
      width: (value: number) => { calls.push(['width', value]); return value }, height: (value: number) => { calls.push(['height', value]); return value },
      scaleX: (value: number) => { calls.push(['scaleX', value]); return value }, scaleY: (value: number) => { calls.push(['scaleY', value]); return value },
      getLayer: () => ({ batchDraw: () => calls.push(['batchDraw', 1]) }), remove: () => undefined,
    }
    expect(restoreNodeFromRuntime(node as never, runtime, item.id)).toBe(true)
    expect(calls.slice(0, 2)).toEqual([['x', 190], ['y', 210]])
  })
})
