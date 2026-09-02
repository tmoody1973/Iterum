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

  it('keeps agent tag suggestions pending until a designer approves and can undo the decision', () => {
    const initial = createDemoWorkspaceState()
    const suggested = applyWorkspaceCommand(initial, { type: 'propose-reference-tags', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'agent-tags', actor: 'agent', targetType: 'board-item', referenceId: 'reference-concrete', suggestion: { id: 'tag-concrete', tags: ['Monolithic', 'Surface Patina'], rationale: 'Material and finish descriptors.' } })
    expect(suggested.ok).toBe(true)
    if (!suggested.ok) return
    expect(suggested.state.boardItems[0].tags).not.toContain('monolithic')
    expect(suggested.state.boardItems[0].tagSuggestions?.[0]).toMatchObject({ tags: ['monolithic', 'surface patina'], status: 'pending' })
    const blocked = applyWorkspaceCommand(suggested.state, { type: 'review-reference-tags', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: suggested.state.version, idempotencyKey: 'agent-approve-tags', actor: 'agent', targetType: 'board-item', referenceId: 'reference-concrete', suggestionId: 'tag-concrete', decision: 'approve' })
    expect(blocked).toMatchObject({ ok: false, error: { code: 'DESIGNER_REVIEW_REQUIRED' } })
    const approved = applyWorkspaceCommand(suggested.state, { type: 'review-reference-tags', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: suggested.state.version, idempotencyKey: 'designer-approve-tags', actor: 'designer', targetType: 'board-item', referenceId: 'reference-concrete', suggestionId: 'tag-concrete', decision: 'approve' })
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    expect(approved.state.boardItems[0].tags).toEqual(expect.arrayContaining(['monolithic', 'surface patina']))
    const undone = applyWorkspaceCommand(approved.state, { type: 'undo-receipt', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: approved.state.version, idempotencyKey: 'undo-tag-decision', actor: 'designer', receiptId: approved.receipt.id })
    expect(undone.ok).toBe(true)
    if (undone.ok) {
      expect(undone.state.boardItems[0].tags).not.toContain('monolithic')
      expect(undone.state.boardItems[0].tagSuggestions?.[0].status).toBe('pending')
    }
  })

  it('keeps an agent type direction pending until designer approval and restores it with Undo', () => {
    const initial = createDemoWorkspaceState()
    const headline = { id: 'fraunces', family: 'Fraunces', category: 'serif' as const, source: 'fontsource' as const, sourceLabel: 'Fontsource', license: 'Open-source via Fontsource', referenceOnly: false, weights: [400, 700], styles: ['normal'], cssUrl: 'https://cdn.jsdelivr.net/fontsource/css/fraunces@latest/index.css' }
    const body = { id: 'instrument-sans', family: 'Instrument Sans', category: 'sans-serif' as const, source: 'google-fonts' as const, sourceLabel: 'Google Fonts', license: 'Open-source via Google Fonts', referenceOnly: false, weights: [400, 600], styles: ['normal'] }
    const proposed = applyWorkspaceCommand(initial, { type: 'propose-type-direction', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'agent-type', actor: 'agent', proposal: { id: 'type-1', headline, body, specimenText: 'The air remembers.', rationale: 'Soft optical tension against a neutral reading face.' } })
    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return
    expect(proposed.state.typeProposals[0].status).toBe('pending')
    expect(proposed.state.typeDirection).toBeNull()
    const blocked = applyWorkspaceCommand(proposed.state, { type: 'review-type-direction', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: proposed.state.version, idempotencyKey: 'agent-type-approval', actor: 'agent', proposalId: 'type-1', decision: 'approve' })
    expect(blocked).toMatchObject({ ok: false, error: { code: 'DESIGNER_REVIEW_REQUIRED' } })
    const approved = applyWorkspaceCommand(proposed.state, { type: 'review-type-direction', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: proposed.state.version, idempotencyKey: 'designer-type-approval', actor: 'designer', proposalId: 'type-1', decision: 'approve' })
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    expect(approved.state.typeDirection).toMatchObject({ headline: { family: 'Fraunces' }, body: { family: 'Instrument Sans' } })
    const undone = applyWorkspaceCommand(approved.state, { type: 'undo-receipt', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: approved.state.version, idempotencyKey: 'undo-type', actor: 'designer', receiptId: approved.receipt.id })
    expect(undone.ok).toBe(true)
    if (undone.ok) {
      expect(undone.state.typeDirection).toBeNull()
      expect(undone.state.typeProposals[0].status).toBe('pending')
    }
  })

  it('reviews, atomically applies, and undoes a Direction Draft', () => {
    const initial = createDemoWorkspaceState()
    const proposal = {
      id: 'layout-severe-editorial', title: 'Severe editorial pressure', rationale: 'Tighten the type territory and attach an explicit art-direction note.',
      changes: [
        { itemId: 'type-specimen-headline', position: { x: 742, y: 430 }, width: 330, height: 190, territory: 'Type pressure', groupId: 'group-type-pressure', groupLabel: 'Type pressure system' },
        { itemId: 'type-specimen-body', position: { x: 742, y: 640 }, groupId: 'group-type-pressure', groupLabel: 'Type pressure system' },
      ],
      notes: [{ id: 'note-type-pressure', title: 'Hold the line', body: 'Keep the typography compressed and severe; let the floral artifact remain the only soft interruption.', tone: 'blue' as const, territory: 'Type pressure', position: { x: 430, y: 760 }, width: 330, height: 130 }],
    }
    const proposed = applyWorkspaceCommand(initial, { type: 'propose-board-layout', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'propose-layout', actor: 'agent', proposal })
    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return
    expect(proposed.state.layoutProposals[0].status).toBe('pending')
    expect(proposed.state.boardItems.find((item) => item.id === 'type-specimen-headline')?.position).toEqual({ x: 790, y: 448 })
    const blocked = applyWorkspaceCommand(proposed.state, { type: 'review-board-layout', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: proposed.state.version, idempotencyKey: 'agent-layout-approval', actor: 'agent', proposalId: proposal.id, decision: 'approve' })
    expect(blocked).toMatchObject({ ok: false, error: { code: 'DESIGNER_REVIEW_REQUIRED' } })
    const approved = applyWorkspaceCommand(proposed.state, { type: 'review-board-layout', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: proposed.state.version, idempotencyKey: 'designer-layout-approval', actor: 'designer', proposalId: proposal.id, decision: 'approve' })
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    expect(approved.state.layoutProposals[0].status).toBe('approved')
    expect(approved.state.boardItems.find((item) => item.id === 'type-specimen-headline')).toMatchObject({ position: { x: 742, y: 430 }, width: 330, groupId: 'group-type-pressure' })
    expect(approved.state.boardItems.find((item) => item.id === 'note-type-pressure')).toMatchObject({ kind: 'note', noteTone: 'blue' })
    expect(approved.receipt.summary).toContain('3 changes')
    const undone = applyWorkspaceCommand(approved.state, { type: 'undo-receipt', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: approved.state.version, idempotencyKey: 'undo-layout', actor: 'designer', receiptId: approved.receipt.id })
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state.layoutProposals[0].status).toBe('pending')
    expect(undone.state.boardItems.some((item) => item.id === 'note-type-pressure')).toBe(false)
    const restoredHeadline = undone.state.boardItems.find((item) => item.id === 'type-specimen-headline')
    expect(restoredHeadline).toMatchObject({ position: { x: 790, y: 448 }, width: 286 })
    expect(restoredHeadline?.groupId).toBeUndefined()
  })

  it('keeps locked reference geometry out of Direction Drafts', () => {
    const initial = createDemoWorkspaceState()
    const result = applyWorkspaceCommand(initial, { type: 'propose-board-layout', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'locked-layout', actor: 'agent', proposal: { id: 'layout-locked', title: 'Move client reference', rationale: 'Should remain protected.', changes: [{ itemId: 'reference-resin-iris', position: { x: 20, y: 20 } }], notes: [] } })
    expect(result).toMatchObject({ ok: false, error: { code: 'LOCKED_REFERENCE' } })
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
