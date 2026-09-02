import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createDemoWorkspaceState } from '../../lib/domain/demo-data'
import { createWorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import { ReviewTray } from './review-tray'
import { ActionReceipt } from './action-receipt'
import { useUiStore } from '../../stores/ui-store'

afterEach(cleanup)

describe('review flow', () => {
  it('approves, places exactly once, records a receipt, and compensates through Undo', () => {
    const runtime = createWorkspaceRuntime(createDemoWorkspaceState())
    const view = render(<><ReviewTray runtime={runtime} snapshot={runtime.getSnapshot()} /><ActionReceipt runtime={runtime} /></>)
    fireEvent.click(screen.getByRole('button', { name: /approve to floral artifact/i }))
    expect(runtime.getSnapshot().version).toBe(4)
    expect(runtime.getSnapshot().boardItems).toHaveLength(8)
    expect(runtime.getSnapshot().proposals[0].status).toBe('approved')
    view.rerender(<><ReviewTray runtime={runtime} snapshot={runtime.getSnapshot()} /><ActionReceipt runtime={runtime} receipt={runtime.getSnapshot().receipts[0]} /></>)
    fireEvent.click(screen.getByRole('button', { name: /undo/i }))
    expect(runtime.getSnapshot().version).toBe(5)
    expect(runtime.getSnapshot().boardItems).toHaveLength(7)
    expect(runtime.getSnapshot().proposals[0].status).toBe('pending')
  })

  it('records rejection without placement and makes direct placement an explicit versioned boundary', () => {
    const runtime = createWorkspaceRuntime(createDemoWorkspaceState())
    const view = render(<ReviewTray runtime={runtime} snapshot={runtime.getSnapshot()} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /allow agent direct placement/i }))
    expect(runtime.getSnapshot().placementPolicy.allowAgentDirectPlacement).toBe(true)
    expect(runtime.getSnapshot().receipts[0].action).toBe('set-placement-policy')
    view.rerender(<ReviewTray runtime={runtime} snapshot={runtime.getSnapshot()} />)
    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }))
    expect(runtime.getSnapshot().boardItems).toHaveLength(7)
    expect(runtime.getSnapshot().proposals[0].status).toBe('rejected')
  })

  it('previews and atomically applies a Direction Draft from Review', () => {
    const runtime = createWorkspaceRuntime(createDemoWorkspaceState())
    const proposed = runtime.dispatch({ type: 'propose-board-layout', campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedVersion: 3, idempotencyKey: 'review-layout', actor: 'agent', proposal: { id: 'draft-review', title: 'Editorial compression', rationale: 'Group the two type specimens and annotate the pressure.', changes: [{ itemId: 'type-specimen-headline', groupId: 'type-system', groupLabel: 'Type pressure system' }, { itemId: 'type-specimen-body', groupId: 'type-system', groupLabel: 'Type pressure system' }], notes: [{ id: 'note-review', title: 'Keep it severe', body: 'No decorative softness in the typography.', tone: 'blue', territory: 'Type pressure', position: { x: 430, y: 760 }, width: 300, height: 120 }] } })
    expect(proposed.ok).toBe(true)
    render(<ReviewTray runtime={runtime} snapshot={runtime.getSnapshot()} />)
    fireEvent.click(screen.getByRole('button', { name: /preview on board/i }))
    expect(useUiStore.getState().previewLayoutProposalId).toBe('draft-review')
    fireEvent.click(screen.getByRole('button', { name: /apply direction/i }))
    expect(runtime.getSnapshot().version).toBe(5)
    expect(runtime.getSnapshot().layoutProposals[0].status).toBe('approved')
    expect(runtime.getSnapshot().boardItems.find((item) => item.id === 'note-review')).toMatchObject({ kind: 'note', noteBody: 'No decorative softness in the typography.' })
    expect(useUiStore.getState().previewLayoutProposalId).toBeNull()
  })
})
