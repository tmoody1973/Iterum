import { describe, expect, it } from 'vitest'

import { applyWorkspaceCommand } from './commands'
import { createDemoWorkspaceState } from './demo-data'

describe('applyWorkspaceCommand', () => {
  it('approves a proposal, places it, and records an undoable receipt', () => {
    const initial = createDemoWorkspaceState()
    const approveResult = applyWorkspaceCommand(initial, {
      type: 'approve-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'approve-resin', actor: 'designer', proposalId: 'proposal-resin',
    })

    expect(approveResult.ok).toBe(true)
    if (!approveResult.ok) return
    expect(approveResult.state.version).toBe(initial.version + 1)
    expect(approveResult.state.proposals.find((item) => item.id === 'proposal-resin')?.status).toBe('approved')
    expect(approveResult.state.boardItems.some((item) => item.sourceProposalId === 'proposal-resin')).toBe(true)
    expect(approveResult.receipt?.undoable).toBe(true)
    expect(approveResult.state.receipts[0]).toEqual(approveResult.receipt)
    expect(initial.proposals.find((item) => item.id === 'proposal-resin')?.status).toBe('pending')
  })

  it('returns a version conflict without changing state', () => {
    const initial = createDemoWorkspaceState()
    const result = applyWorkspaceCommand(initial, {
      type: 'reject-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version + 1, idempotencyKey: 'conflict', actor: 'designer', proposalId: 'proposal-resin',
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'VERSION_CONFLICT' }, state: initial })
  })

  it('protects locked references from movement', () => {
    const initial = createDemoWorkspaceState()
    const locked = initial.boardItems.find((item) => item.locked)
    expect(locked).toBeDefined()
    const result = applyWorkspaceCommand(initial, {
      type: 'move-board-item', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'move-locked', actor: 'agent', itemId: locked!.id, position: { x: 10, y: 10 },
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'LOCKED_REFERENCE' }, state: initial })
  })

  it('rejects without placing an item', () => {
    const initial = createDemoWorkspaceState()
    const result = applyWorkspaceCommand(initial, {
      type: 'reject-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'reject-resin', actor: 'designer', proposalId: 'proposal-resin',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.proposals.find((item) => item.id === 'proposal-resin')?.status).toBe('rejected')
    expect(result.state.boardItems).toHaveLength(initial.boardItems.length)
  })

  it('replays an idempotency key without another version or receipt', () => {
    const initial = createDemoWorkspaceState()
    const command = {
      type: 'reject-proposal' as const, campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'reject-replay', actor: 'designer' as const, proposalId: 'proposal-resin',
    }
    const first = applyWorkspaceCommand(initial, command)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const replay = applyWorkspaceCommand(first.state, { ...command, expectedVersion: first.state.version })
    expect(replay).toEqual(first)
  })

  it('requires an explicit direct-placement policy grant', () => {
    const initial = createDemoWorkspaceState()
    const proposed = applyWorkspaceCommand(initial, {
      type: 'propose-reference', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'agent-proposal', actor: 'agent',
      proposal: { id: 'proposal-agent', title: 'Agent capture', sourceUrl: 'https://example.test/capture', attribution: 'Example', rightsStatus: 'uncertain', rationale: 'A source for testing.', intendedTerritory: 'Agent Additions', directPlacement: true },
    })
    expect(proposed).toMatchObject({ ok: false, error: { code: 'DIRECT_PLACEMENT_NOT_ALLOWED' } })

    const policy = applyWorkspaceCommand(initial, {
      type: 'set-placement-policy', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'allow-direct', actor: 'designer',
      placementPolicy: { allowAgentDirectPlacement: true, directPlacementTerritory: 'Agent Additions' },
    })
    expect(policy.ok).toBe(true)
    if (!policy.ok) return
    const allowed = applyWorkspaceCommand(policy.state, {
      type: 'propose-reference', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: policy.state.version, idempotencyKey: 'agent-direct', actor: 'agent',
      proposal: { id: 'proposal-direct', title: 'Direct capture', sourceUrl: 'https://example.test/direct', attribution: 'Example', rightsStatus: 'uncertain', rationale: 'A direct-policy test.', intendedTerritory: 'Ignored', directPlacement: true },
    })
    expect(allowed.ok).toBe(true)
    if (!allowed.ok) return
    expect(allowed.state.boardItems.some((item) => item.sourceProposalId === 'proposal-direct' && item.territory === 'Agent Additions')).toBe(true)
  })

  it('undoes an approval with a compensating command and a new receipt', () => {
    const initial = createDemoWorkspaceState()
    const approved = applyWorkspaceCommand(initial, {
      type: 'approve-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'approve-for-undo', actor: 'designer', proposalId: 'proposal-resin',
    })
    expect(approved.ok).toBe(true)
    if (!approved.ok || !approved.receipt) return
    const undone = applyWorkspaceCommand(approved.state, {
      type: 'undo-receipt', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: approved.state.version, idempotencyKey: 'undo-approval', actor: 'designer', receiptId: approved.receipt.id,
    })
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state.version).toBe(initial.version + 2)
    expect(undone.state.proposals.find((item) => item.id === 'proposal-resin')?.status).toBe('pending')
    expect(undone.state.boardItems.some((item) => item.sourceProposalId === 'proposal-resin')).toBe(false)
    expect(undone.receipt?.action).toBe('undo-receipt')
  })
})
