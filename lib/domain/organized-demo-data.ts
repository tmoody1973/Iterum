import { applyWorkspaceCommand } from './commands'
import { createDemoWorkspaceState } from './demo-data'
import type { BoardOrganizationRequest, WorkspaceState } from './types'

export const organizedDemoRequest: BoardOrganizationRequest = {
  id: 'organized-demo-type-pressure',
  title: 'Type pressure hierarchy',
  scope: { type: 'route', routeId: 'route-synthetic' },
  strategy: 'type',
  layout: 'cluster-grid',
  maximumGroups: 3,
  ranking: 'visual-weight',
  briefKeywords: ['severe', 'warm'],
}

/** A deterministic, already-approved organization result for visual review. */
export function createOrganizedDemoWorkspaceState(): WorkspaceState {
  const initial = createDemoWorkspaceState()
  const cleanupProposed = applyWorkspaceCommand(initial, {
    type: 'propose-board-layout',
    campaignId: initial.campaign.id,
    boardId: initial.campaign.boardId,
    expectedVersion: initial.version,
    idempotencyKey: 'organized-demo-cleanup-propose',
    actor: 'designer',
    proposal: {
      id: 'organized-demo-cleanup',
      title: 'Resolve territory collisions',
      rationale: 'Keeps the campaign proof and palette inside clear working lanes before hierarchy is applied.',
      changes: [
        { itemId: 'campaign-proof-static-bloom', position: { x: 406, y: 464 }, width: 298, height: 358 },
        { itemId: 'color-strip-static-bloom', position: { x: 760, y: 784 }, width: 296, height: 28 },
      ],
      notes: [],
    },
  })
  if (!cleanupProposed.ok) throw new Error(`Could not prepare the organized demo lanes: ${cleanupProposed.error.message}`)
  const cleanupApproved = applyWorkspaceCommand(cleanupProposed.state, {
    type: 'review-board-layout',
    campaignId: cleanupProposed.state.campaign.id,
    boardId: cleanupProposed.state.campaign.boardId,
    expectedVersion: cleanupProposed.state.version,
    idempotencyKey: 'organized-demo-cleanup-approve',
    actor: 'designer',
    proposalId: 'organized-demo-cleanup',
    decision: 'approve',
  })
  if (!cleanupApproved.ok) throw new Error(`Could not approve the organized demo lanes: ${cleanupApproved.error.message}`)

  const proposed = applyWorkspaceCommand(cleanupApproved.state, {
    type: 'propose-board-organization',
    campaignId: cleanupApproved.state.campaign.id,
    boardId: cleanupApproved.state.campaign.boardId,
    expectedVersion: cleanupApproved.state.version,
    idempotencyKey: 'organized-demo-propose',
    actor: 'agent',
    request: organizedDemoRequest,
  })
  if (!proposed.ok) throw new Error(`Could not prepare the organized demo: ${proposed.error.message}`)

  const approved = applyWorkspaceCommand(proposed.state, {
    type: 'review-board-layout',
    campaignId: proposed.state.campaign.id,
    boardId: proposed.state.campaign.boardId,
    expectedVersion: proposed.state.version,
    idempotencyKey: 'organized-demo-approve',
    actor: 'designer',
    proposalId: organizedDemoRequest.id,
    decision: 'approve',
  })
  if (!approved.ok) throw new Error(`Could not approve the organized demo: ${approved.error.message}`)
  return approved.state
}
