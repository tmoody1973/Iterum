import { applyWorkspaceCommand } from './commands'
import { createCreativeTerritoryProposal } from './creative-territory'
import { createDemoWorkspaceState } from './demo-data'
import type { CreativeTerritoryRequest, WorkspaceState } from './types'

export const creativeTerritoryDemoRequest: CreativeTerritoryRequest = {
  id: 'territory-review-afterimage', title: 'Mineral afterimage', routeId: 'route-synthetic',
  thesis: 'Industrial warmth becomes intimate when severe type presses against preserved floral matter.',
  mood: 'Tense, tactile, electrically warm', density: 'balanced',
  groupingSignals: ['material contrast', 'compressed scale', 'sodium warmth'],
  references: [
    { itemId: 'reference-type-study', contribution: 'composition', annotation: 'Use its interrupted vertical rhythm and extreme scale, not its literal wording.' },
    { itemId: 'reference-resin-iris', contribution: 'materiality', annotation: 'Borrow the suspended, preserved surface as the soft counterpoint to severe typography.' },
  ],
  hierarchy: { heroItemId: 'type-specimen-headline', primaryItemIds: ['type-specimen-body'], supportingItemIds: [] },
  typography: { headlineItemId: 'type-specimen-headline', bodyItemId: 'type-specimen-body', relationship: 'Compressed display type leads; restrained grotesk carries facts and captions.', scaleRatio: 5 },
  palette: [
    { hex: '#171717', name: 'Carbon', role: 'ground' }, { hex: '#E1B86A', name: 'Sodium amber', role: 'accent' },
    { hex: '#A05040', name: 'Oxide', role: 'support' }, { hex: '#F0ECE4', name: 'Proof paper', role: 'type' },
  ],
  relationships: [{ fromItemId: 'reference-type-study', toItemId: 'reference-resin-iris', kind: 'contrast', rationale: 'Rigid typographic pressure makes the fragile preserved bloom feel stranger and more tactile.' }],
  application: { itemId: 'campaign-proof-static-bloom', format: 'Launch poster', caption: 'Tests whether the hierarchy survives as a real campaign application.' },
}

export function createCreativeTerritoryReviewState(): WorkspaceState {
  const base = createDemoWorkspaceState()
  const initial: WorkspaceState = {
    ...base,
    creativeRoutes: base.creativeRoutes.map((route) => ({ ...route, status: route.id === creativeTerritoryDemoRequest.routeId ? 'approved' : 'rejected' })),
    proposals: [],
  }
  const generated = createCreativeTerritoryProposal(initial, creativeTerritoryDemoRequest)
  if (!generated.ok) throw new Error(`Could not compose the territory review: ${generated.message}`)
  const proposed = applyWorkspaceCommand(initial, {
    type: 'propose-board-layout', campaignId: initial.campaign.id, boardId: initial.campaign.boardId,
    expectedVersion: initial.version, idempotencyKey: 'territory-review-propose', actor: 'agent', proposal: generated.proposal,
  })
  if (!proposed.ok) throw new Error(`Could not open the territory review: ${proposed.error.message}`)
  return proposed.state
}
