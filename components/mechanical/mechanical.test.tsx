import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createDemoWorkspaceState } from '../../lib/domain/demo-data'
import { createWorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import { useUiStore } from '../../stores/ui-store'
import { BoardOutline } from './board-outline'

function renderOutline() {
  const runtime = createWorkspaceRuntime(createDemoWorkspaceState())
  const select = (id: string) => useUiStore.getState().selectBoardItem(id)
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
})
