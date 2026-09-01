import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createDemoWorkspaceState } from '../../lib/domain/demo-data'
import { createWorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import { ReviewTray } from './review-tray'
import { ActionReceipt } from './action-receipt'

afterEach(cleanup)

describe('review flow', () => {
  it('approves, places exactly once, records a receipt, and compensates through Undo', () => {
    const runtime = createWorkspaceRuntime(createDemoWorkspaceState())
    const view = render(<><ReviewTray runtime={runtime} snapshot={runtime.getSnapshot()} /><ActionReceipt runtime={runtime} /></>)
    fireEvent.click(screen.getByRole('button', { name: /approve to floral artifact/i }))
    expect(runtime.getSnapshot().version).toBe(4)
    expect(runtime.getSnapshot().boardItems).toHaveLength(4)
    expect(runtime.getSnapshot().proposals[0].status).toBe('approved')
    view.rerender(<><ReviewTray runtime={runtime} snapshot={runtime.getSnapshot()} /><ActionReceipt runtime={runtime} receipt={runtime.getSnapshot().receipts[0]} /></>)
    fireEvent.click(screen.getByRole('button', { name: /undo/i }))
    expect(runtime.getSnapshot().version).toBe(5)
    expect(runtime.getSnapshot().boardItems).toHaveLength(3)
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
    expect(runtime.getSnapshot().boardItems).toHaveLength(3)
    expect(runtime.getSnapshot().proposals[0].status).toBe('rejected')
  })
})
