import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDemoWorkspaceState } from '../../lib/domain/demo-data'
import { createWorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import { ActionHistory } from './action-history'

afterEach(cleanup)

describe('action history', () => {
  it('explains the empty state without showing a board overlay', () => {
    const runtime = createWorkspaceRuntime(createDemoWorkspaceState())
    render(<ActionHistory snapshot={runtime.getSnapshot()} runtime={runtime} onClose={() => undefined} />)
    expect(screen.getByRole('complementary', { name: 'History' })).toContainElement(screen.getByText(/no completed actions yet/i))
  })

  it('stores completed receipts and exposes reversible actions', () => {
    const initial = createDemoWorkspaceState()
    const runtime = createWorkspaceRuntime({ ...initial, boardItems: [{ ...initial.boardItems[0], locked: false }, ...initial.boardItems.slice(1)] })
    runtime.dispatch({ type: 'move-board-item', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'history-move', actor: 'designer', itemId: initial.boardItems[0].id, position: { x: 76, y: 82 } })
    const onClose = vi.fn()
    render(<ActionHistory snapshot={runtime.getSnapshot()} runtime={runtime} onClose={onClose} />)
    expect(screen.getByText(/moved wet concrete/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /undo moved wet concrete/i })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Close History' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
