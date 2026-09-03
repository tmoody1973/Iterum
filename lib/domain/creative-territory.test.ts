import { describe, expect, it } from 'vitest'

import { createCreativeTerritoryProposal } from './creative-territory'
import { createDemoWorkspaceState } from './demo-data'
import type { CreativeTerritoryRequest } from './types'

export const territoryFixture: CreativeTerritoryRequest = {
  id: 'territory-afterimage',
  title: 'Mineral afterimage',
  routeId: 'route-synthetic',
  thesis: 'Industrial warmth becomes intimate when severe type presses against preserved floral matter.',
  mood: 'Tense, tactile, electrically warm',
  density: 'balanced',
  groupingSignals: ['material contrast', 'compressed scale', 'sodium warmth'],
  references: [
    { itemId: 'reference-type-study', contribution: 'composition', annotation: 'Use its interrupted vertical rhythm and extreme scale, not its literal wording.' },
    { itemId: 'reference-resin-iris', contribution: 'materiality', annotation: 'Borrow the suspended, preserved surface as the soft counterpoint to severe typography.' },
  ],
  hierarchy: { heroItemId: 'type-specimen-headline', primaryItemIds: ['type-specimen-body'], supportingItemIds: [] },
  typography: { headlineItemId: 'type-specimen-headline', bodyItemId: 'type-specimen-body', relationship: 'Compressed display type leads; restrained grotesk carries facts and captions.', scaleRatio: 5 },
  palette: [
    { hex: '#171717', name: 'Carbon', role: 'ground' },
    { hex: '#E1B86A', name: 'Sodium amber', role: 'accent' },
    { hex: '#A05040', name: 'Oxide', role: 'support' },
    { hex: '#F0ECE4', name: 'Proof paper', role: 'type' },
  ],
  relationships: [{ fromItemId: 'reference-type-study', toItemId: 'reference-resin-iris', kind: 'contrast', rationale: 'Rigid typographic pressure makes the fragile preserved bloom feel stranger and more tactile.' }],
  application: { itemId: 'campaign-proof-static-bloom', format: 'Launch poster', caption: 'Tests whether the hierarchy survives as a real campaign application.' },
}

describe('creative territory composition', () => {
  it('combines art direction with collision-safe organization without changing canonical items', () => {
    const state = createDemoWorkspaceState()
    const before = structuredClone(state.boardItems)
    const result = createCreativeTerritoryProposal(state, territoryFixture)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(state.boardItems).toEqual(before)
    expect(result.proposal.creativeTerritory).toMatchObject({ thesis: territoryFixture.thesis, density: 'balanced', baselineBoardVersion: 3 })
    expect(result.proposal.organization?.untouchedLockedItemIds).toEqual(['reference-type-study'])
    expect(result.proposal.organization?.assignments.map(({ itemId, role }) => ({ itemId, role }))).toEqual([
      { itemId: 'type-specimen-headline', role: 'hero' },
      { itemId: 'type-specimen-body', role: 'primary' },
    ])
  })

  it('rejects a territory without two reference contributions', () => {
    const result = createCreativeTerritoryProposal(createDemoWorkspaceState(), { ...territoryFixture, references: territoryFixture.references.slice(0, 1) })
    expect(result).toMatchObject({ ok: false, code: 'INVALID_BOARD_ORGANIZATION' })
  })

  it('rejects hierarchy copy that disagrees with the generated composition', () => {
    const result = createCreativeTerritoryProposal(createDemoWorkspaceState(), { ...territoryFixture, hierarchy: { heroItemId: 'type-specimen-body', primaryItemIds: ['type-specimen-headline'], supportingItemIds: [] } })
    expect(result).toMatchObject({ ok: false, code: 'INVALID_BOARD_ORGANIZATION' })
  })
})
