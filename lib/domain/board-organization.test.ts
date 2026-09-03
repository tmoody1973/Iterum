import { describe, expect, it } from 'vitest'

import { createDemoWorkspaceState } from './demo-data'
import { createBoardOrganizationProposal } from './board-organization'
import { applyWorkspaceCommand } from './commands'

const request = {
  id: 'organization-type-pressure-v3',
  title: 'Organize Type pressure by type',
  scope: { type: 'route' as const, routeId: 'route-synthetic' },
  strategy: 'type' as const,
  layout: 'cluster-grid' as const,
  maximumGroups: 3,
  ranking: 'visual-weight' as const,
  briefKeywords: ['severe', 'warm'],
}

describe('board organization', () => {
  const rectanglesOverlap = (a: { position: { x: number; y: number }; width: number; height: number }, b: { position: { x: number; y: number }; width: number; height: number }) =>
    a.position.x < b.position.x + b.width + 8 && a.position.x + a.width + 8 > b.position.x && a.position.y < b.position.y + b.height + 8 && a.position.y + a.height + 8 > b.position.y

  it('creates the same route-aware proposal for the same board version and preserves locked material', () => {
    const state = createDemoWorkspaceState()
    const first = createBoardOrganizationProposal(state, request)
    const second = createBoardOrganizationProposal(state, request)
    expect(first).toEqual(second)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.proposal.organization).toMatchObject({ baselineBoardVersion: 3, strategy: 'type', layout: 'cluster-grid', untouchedLockedItemIds: ['reference-type-study'] })
    expect(first.proposal.changes.map((change) => change.itemId).sort()).toEqual(['type-specimen-body', 'type-specimen-headline'])
    expect(first.proposal.changes.every((change) => change.position!.x % 8 === 0 && change.position!.y % 8 === 0)).toBe(true)
    expect(first.proposal.organization?.assignments.map((assignment) => assignment.role)).toEqual(['hero', 'primary'])
    expect(state.boardItems.find((item) => item.id === 'reference-type-study')).toMatchObject({ position: { x: 736, y: 64 }, width: 252, height: 350, locked: true })
    expect(state.boardItems.find((item) => item.id === 'reference-type-study')?.groupId).toBeUndefined()
  })

  it('surfaces references without approved tags instead of forcing a weak assignment', () => {
    const state = createDemoWorkspaceState()
    state.boardItems = state.boardItems.map((item) => item.id === 'type-specimen-body' ? { ...item, tags: [] } : item)
    const result = createBoardOrganizationProposal(state, { ...request, strategy: 'tag' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.proposal.organization?.unresolvedItems).toContainEqual({ itemId: 'type-specimen-body', reason: 'No approved tag is available for deterministic grouping.' })
    expect(result.proposal.changes.some((change) => change.itemId === 'type-specimen-body')).toBe(false)
  })

  it('keeps preview noncanonical, reserves approval for the designer, rejects stale previews, and undoes exactly', () => {
    const initial = createDemoWorkspaceState()
    const beforeItems = structuredClone(initial.boardItems)
    const proposed = applyWorkspaceCommand(initial, { type: 'propose-board-organization', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'propose-organization', actor: 'agent', request })
    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return
    expect(proposed.state.boardItems).toEqual(beforeItems)
    expect(proposed.state.layoutProposals[0]).toMatchObject({ id: request.id, status: 'pending' })

    const agentApply = applyWorkspaceCommand(proposed.state, { type: 'review-board-layout', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: proposed.state.version, idempotencyKey: 'agent-apply-organization', actor: 'agent', proposalId: request.id, decision: 'approve' })
    expect(agentApply).toMatchObject({ ok: false, error: { code: 'DESIGNER_REVIEW_REQUIRED' } })

    const applied = applyWorkspaceCommand(proposed.state, { type: 'review-board-layout', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: proposed.state.version, idempotencyKey: 'designer-apply-organization', actor: 'designer', proposalId: request.id, decision: 'approve' })
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.state.boardItems.find((item) => item.id === 'type-specimen-headline')).toMatchObject({ groupLabel: 'Typography', hierarchyRole: 'hero' })
    expect(applied.state.boardItems.find((item) => item.id === 'reference-type-study')).toEqual(beforeItems.find((item) => item.id === 'reference-type-study'))

    const undone = applyWorkspaceCommand(applied.state, { type: 'undo-receipt', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: applied.state.version, idempotencyKey: 'undo-organization', actor: 'designer', receiptId: applied.receipt.id })
    expect(undone.ok).toBe(true)
    if (undone.ok) expect(undone.state.boardItems).toEqual(beforeItems)

    const moved = applyWorkspaceCommand(proposed.state, { type: 'move-board-item', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: proposed.state.version, idempotencyKey: 'move-after-preview', actor: 'designer', itemId: 'campaign-proof-static-bloom', position: { x: 360, y: 180 } })
    expect(moved.ok).toBe(true)
    if (!moved.ok) return
    const stale = applyWorkspaceCommand(moved.state, { type: 'review-board-layout', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: moved.state.version, idempotencyKey: 'apply-stale-organization', actor: 'designer', proposalId: request.id, decision: 'approve' })
    expect(stale).toMatchObject({ ok: false, error: { code: 'STALE_BOARD_ORGANIZATION' } })
  })

  it('is geometrically idempotent when the same scope is organized again', () => {
    const initial = createDemoWorkspaceState()
    const proposed = applyWorkspaceCommand(initial, { type: 'propose-board-organization', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: initial.version, idempotencyKey: 'propose-first-organization', actor: 'agent', request })
    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return
    const applied = applyWorkspaceCommand(proposed.state, { type: 'review-board-layout', campaignId: initial.campaign.id, boardId: initial.campaign.boardId, expectedVersion: proposed.state.version, idempotencyKey: 'apply-first-organization', actor: 'designer', proposalId: request.id, decision: 'approve' })
    expect(applied.ok).toBe(true)
    if (!applied.ok) return

    const repeated = createBoardOrganizationProposal(applied.state, { ...request, id: 'organization-type-pressure-repeat' })
    expect(repeated.ok).toBe(true)
    if (!repeated.ok) return
    expect(repeated.proposal.changes.map(({ itemId, position, width, height }) => ({ itemId, position, width, height }))).toEqual(
      proposed.state.layoutProposals[0].changes.map(({ itemId, position, width, height }) => ({ itemId, position, width, height })),
    )
  })

  it('keeps proposed items inside their route and clear of every unrelated board object', () => {
    const state = createDemoWorkspaceState()
    const result = createBoardOrganizationProposal(state, request)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const route = state.creativeRoutes.find((candidate) => candidate.id === 'route-synthetic')!
    const affected = new Set(result.proposal.changes.map((change) => change.itemId))
    const obstacles = state.boardItems.filter((item) => !affected.has(item.id))
    result.proposal.changes.forEach((change) => {
      const projected = { position: change.position!, width: change.width!, height: change.height! }
      expect(projected.position.x).toBeGreaterThanOrEqual(route.frame.position.x)
      expect(projected.position.y).toBeGreaterThanOrEqual(route.frame.position.y)
      expect(projected.position.x + projected.width).toBeLessThanOrEqual(route.frame.position.x + route.frame.width)
      expect(projected.position.y + projected.height).toBeLessThanOrEqual(route.frame.position.y + route.frame.height)
      expect(obstacles.filter((obstacle) => rectanglesOverlap(projected, obstacle))).toEqual([])
    })
  })

  it('keeps a 200-item organization pass bounded and accounts for every movable item', () => {
    const state = createDemoWorkspaceState()
    state.boardItems = Array.from({ length: 200 }, (_, index) => ({
      id: `scale-reference-${index}`,
      title: `Scale reference ${index + 1}`,
      kind: 'reference' as const,
      territory: 'Scale test',
      position: { x: (index % 10) * 120, y: Math.floor(index / 10) * 136 },
      width: 104,
      height: 120,
      locked: false,
      tags: ['scale'],
    }))
    const started = performance.now()
    const result = createBoardOrganizationProposal(state, { ...request, id: 'organization-scale', title: 'Scale organization', scope: { type: 'whole-board' }, strategy: 'type', maximumGroups: 4 })
    const duration = performance.now() - started
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const accountedFor = result.proposal.changes.length + (result.proposal.organization?.unresolvedItems.length ?? 0)
    expect(accountedFor).toBe(200)
    expect(duration).toBeLessThan(500)
  })
})
