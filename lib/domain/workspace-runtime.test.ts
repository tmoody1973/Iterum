import { describe, expect, it, vi } from 'vitest'

import { createDemoWorkspaceState } from './demo-data'
import { createWorkspaceRuntime } from './workspace-runtime'

describe('WorkspaceRuntime', () => {
  it('keeps the canonical snapshot and only notifies after successful changes', () => {
    const initial = createDemoWorkspaceState()
    const runtime = createWorkspaceRuntime(initial)
    const listener = vi.fn()
    const unsubscribe = runtime.subscribe(listener)

    const failure = runtime.dispatch({
      type: 'reject-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version + 1, idempotencyKey: 'bad-version', actor: 'designer', proposalId: 'proposal-resin',
    })
    expect(failure.ok).toBe(false)
    expect(listener).not.toHaveBeenCalled()
    expect(runtime.getSnapshot()).toBe(initial)

    const success = runtime.dispatch({
      type: 'reject-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'reject', actor: 'designer', proposalId: 'proposal-resin',
    })
    expect(success.ok).toBe(true)
    expect(listener).toHaveBeenCalledOnce()
    expect(runtime.getSnapshot()).toBe(success.state)

    if (!success.ok) return
    const beforeReplay = runtime.getSnapshot()
    const replay = runtime.dispatch({
      type: 'reject-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: beforeReplay.version, idempotencyKey: 'reject', actor: 'designer', proposalId: 'proposal-resin',
    })
    expect(replay.ok).toBe(true)
    expect(runtime.getSnapshot()).toBe(beforeReplay)
    expect(runtime.getSnapshot().version).toBe(beforeReplay.version)
    expect(runtime.getSnapshot().receipts).toHaveLength(beforeReplay.receipts.length)
    expect(listener).toHaveBeenCalledOnce()

    unsubscribe()
    runtime.dispatch({
      type: 'undo-receipt', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: runtime.getSnapshot().version, idempotencyKey: 'undo', actor: 'designer', receiptId: success.receipt.id,
    })
    expect(listener).toHaveBeenCalledOnce()
  })
})
