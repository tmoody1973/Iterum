import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createDemoWorkspaceState } from '../../lib/domain/demo-data'
import { createWorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import { useUiStore } from '../../stores/ui-store'
import { BoardOutline } from './board-outline'
import { restoreNodeFromItem } from './mechanical-canvas'
import { referenceFilename, referenceSourceClass } from './reference-node'

function renderOutline() {
  const runtime = createWorkspaceRuntime(createDemoWorkspaceState())
  const select = (id: string | null) => useUiStore.getState().selectBoardItem(id)
  render(<BoardOutline snapshot={runtime.getSnapshot()} runtime={runtime} selectedId={null} onSelect={select} />)
  return runtime
}

afterEach(() => cleanup())

describe('mechanical DOM mirror', () => {
  it('lists all three locked references with provenance and no enabled delete action', () => {
    renderOutline()
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(3)
    screen.getAllByRole('button', { name: /delete/i }).forEach((button) => expect(button).toBeDisabled())
    expect(screen.getAllByText(/source: iterum synthetic reference/i)).toHaveLength(3)
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
      getLayer: () => ({ batchDraw: () => calls.push(['batchDraw', 1]) }),
    }
    restoreNodeFromItem(node as never, item)
    expect(calls).toEqual([['x', 56], ['y', 62], ['width', 276], ['height', 356], ['scaleX', 1], ['scaleY', 1], ['batchDraw', 1]])
  })
})
