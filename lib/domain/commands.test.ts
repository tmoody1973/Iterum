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

  it('records deterministic color extraction as a versioned and undoable designer decision', () => {
    const initial = createDemoWorkspaceState()
    const saved = applyWorkspaceCommand(initial, {
      type: 'set-color-palette', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'save-local-colors', actor: 'designer',
      colorPalette: {
        extraction: { referenceId: 'reference-resin-iris', referenceLabel: 'Crushed iris in resin', imageUrl: '/assets/ref-resin-iris.webp', crop: 'center', algorithm: 'iterum-pixel-quantize-v1', colors: [{ hex: '#6E432D', source: 'local-extraction', role: 'extracted' }] },
        pinned: initial.colorPalette.pinned,
      },
    })
    expect(saved.ok).toBe(true)
    if (!saved.ok) return
    expect(saved.state.colorPalette.extraction?.algorithm).toBe('iterum-pixel-quantize-v1')
    expect(saved.receipt.undo?.type).toBe('color-palette')
    const undone = applyWorkspaceCommand(saved.state, { type: 'undo-receipt', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: saved.state.version, idempotencyKey: 'undo-colors', actor: 'designer', receiptId: saved.receipt.id })
    expect(undone.ok).toBe(true)
    if (undone.ok) expect(undone.state.colorPalette).toEqual(initial.colorPalette)
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

  it('persists resize dimensions and protects locked references', () => {
    const initial = createDemoWorkspaceState()
    const locked = initial.boardItems[0]
    const blocked = applyWorkspaceCommand(initial, {
      type: 'resize-board-item', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'resize-locked', actor: 'designer', itemId: locked.id, width: 320, height: 420,
    })
    expect(blocked).toMatchObject({ ok: false, error: { code: 'LOCKED_REFERENCE' } })

    const editable = { ...initial, boardItems: initial.boardItems.map((item, index) => index === 0 ? { ...item, locked: false } : item) }
    const resized = applyWorkspaceCommand(editable, {
      type: 'resize-board-item', campaignId: editable.campaign.id, boardId: editable.campaign.boardId,
      expectedVersion: editable.version, idempotencyKey: 'resize-editable', actor: 'designer', itemId: locked.id, width: 320, height: 420,
    })
    expect(resized.ok).toBe(true)
    if (!resized.ok) return
    expect(resized.state.boardItems[0]).toMatchObject({ width: 320, height: 420 })
    expect(resized.receipt.undo?.type).toBe('resize')
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
    const invalidPolicy = applyWorkspaceCommand(initial, {
      type: 'set-placement-policy', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'invalid-direct-territory', actor: 'designer',
      placementPolicy: { allowAgentDirectPlacement: true, directPlacementTerritory: 'Editorial spread' },
    })
    expect(invalidPolicy).toMatchObject({ ok: false, error: { code: 'INVALID_PLACEMENT_POLICY' }, state: initial })
    expect(invalidPolicy.state).toBe(initial)

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

  it('preserves valid capture provenance and crop metadata through review and placement', () => {
    const initial = createDemoWorkspaceState()
    const proposed = applyWorkspaceCommand(initial, {
      type: 'propose-reference', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
      expectedVersion: initial.version, idempotencyKey: 'captured-proposal', actor: 'designer',
      proposal: { id: 'capture-1', title: 'Captured texture', imageUrl: 'https://images.example.com/texture.jpg', sourceUrl: 'https://example.com/texture', attribution: 'Example studio', rightsStatus: 'uncertain', rationale: 'Surface direction.', intendedTerritory: 'Material tension', captureProvider: 'microlink', crop: { x: 15, y: 10, width: 70, height: 80 } },
    })
    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return
    expect(proposed.state.proposals[0]).toMatchObject({ captureProvider: 'microlink', crop: { x: 15, y: 10, width: 70, height: 80 } })
    const approved = applyWorkspaceCommand(proposed.state, { type: 'approve-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: proposed.state.version, idempotencyKey: 'approve-captured', actor: 'designer', proposalId: 'capture-1' })
    expect(approved.ok).toBe(true)
    if (approved.ok) expect(approved.state.boardItems.at(-1)).toMatchObject({ captureProvider: 'microlink', crop: { x: 15, y: 10, width: 70, height: 80 } })
  })

  it('lets only the designer commit and undo a local isolation derivative', () => {
    const initial = createDemoWorkspaceState()
    const isolation = { sourceImageUrl: '/assets/ref-resin-iris.webp', imageDataUrl: 'data:image/png;base64,aXNvbGF0ZWQ=', algorithm: 'iterum-border-matte-v1' as const, sensitivity: 50, removedRatio: 0.42 }
    const blocked = applyWorkspaceCommand(initial, { type: 'set-proposal-isolation', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'agent-isolation', actor: 'agent', proposalId: 'proposal-resin', isolation })
    expect(blocked).toMatchObject({ ok: false, error: { code: 'DESIGNER_REVIEW_REQUIRED' } })
    const saved = applyWorkspaceCommand(initial, { type: 'set-proposal-isolation', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'designer-isolation', actor: 'designer', proposalId: 'proposal-resin', isolation })
    expect(saved.ok).toBe(true)
    if (!saved.ok) return
    expect(saved.state.proposals[0].isolation).toEqual(isolation)
    const approved = applyWorkspaceCommand(saved.state, { type: 'approve-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: saved.state.version, idempotencyKey: 'approve-isolated', actor: 'designer', proposalId: 'proposal-resin' })
    expect(approved.ok).toBe(true)
    if (approved.ok) expect(approved.state.boardItems.at(-1)).toMatchObject({ imageUrl: isolation.imageDataUrl, originalImageUrl: isolation.sourceImageUrl })
    const undone = applyWorkspaceCommand(saved.state, { type: 'undo-receipt', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: saved.state.version, idempotencyKey: 'undo-isolation', actor: 'designer', receiptId: saved.receipt.id })
    expect(undone.ok).toBe(true)
    if (undone.ok) expect(undone.state.proposals[0].isolation).toBeUndefined()
  })

  it('rejects crop metadata that leaves the source image bounds', () => {
    const initial = createDemoWorkspaceState()
    const result = applyWorkspaceCommand(initial, { type: 'propose-reference', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'invalid-crop', actor: 'designer', proposal: { id: 'bad-crop', title: 'Bad crop', sourceUrl: 'https://example.com', attribution: 'Example', rightsStatus: 'uncertain', rationale: 'Invalid.', intendedTerritory: 'Material tension', crop: { x: 80, y: 0, width: 30, height: 100 }, captureProvider: 'manual' } })
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_REFERENCE' } })
  })

  it('requires agent approval policy and forces agent approvals to Agent Additions', () => {
    const initial = createDemoWorkspaceState()
    const blocked = applyWorkspaceCommand(initial, { type: 'approve-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'agent-approve-blocked', actor: 'agent', proposalId: 'proposal-resin' })
    expect(blocked).toMatchObject({ ok: false, error: { code: 'DIRECT_PLACEMENT_NOT_ALLOWED' } })
    const granted = applyWorkspaceCommand(initial, { type: 'set-placement-policy', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'agent-approve-policy', actor: 'designer', placementPolicy: { allowAgentDirectPlacement: true, directPlacementTerritory: 'Agent Additions' } })
    expect(granted.ok).toBe(true)
    if (!granted.ok) return
    const approved = applyWorkspaceCommand(granted.state, { type: 'approve-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: granted.state.version, idempotencyKey: 'agent-approve-allowed', actor: 'agent', proposalId: 'proposal-resin' })
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    expect(approved.state.boardItems.at(-1)?.territory).toBe('Agent Additions')
    expect(approved.receipt.summary).toContain('Agent Additions')
  })

  it('does not allow an agent to reject or undo a designer receipt', () => {
    const initial = createDemoWorkspaceState()
    const rejected = applyWorkspaceCommand(initial, { type: 'reject-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'agent-reject', actor: 'agent', proposalId: 'proposal-resin' })
    expect(rejected).toMatchObject({ ok: false, error: { code: 'DESIGNER_REVIEW_REQUIRED' } })
    const approved = applyWorkspaceCommand(initial, { type: 'approve-proposal', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'designer-approval', actor: 'designer', proposalId: 'proposal-resin' })
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    const undone = applyWorkspaceCommand(approved.state, { type: 'undo-receipt', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: approved.state.version, idempotencyKey: 'agent-undo-designer', actor: 'agent', receiptId: approved.receipt.id })
    expect(undone).toMatchObject({ ok: false, error: { code: 'DESIGNER_REVIEW_REQUIRED' } })
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
