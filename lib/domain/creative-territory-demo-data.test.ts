import { describe, expect, it } from 'vitest'

import { createCreativeTerritoryReviewState, creativeTerritoryDemoRequest } from './creative-territory-demo-data'

describe('creative territory review scenario', () => {
  it('opens one focused proposal without changing the canonical board before approval', () => {
    const state = createCreativeTerritoryReviewState()
    const pending = state.layoutProposals.filter((proposal) => proposal.status === 'pending')

    expect(state.version).toBe(4)
    expect(state.proposals).toHaveLength(0)
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({
      id: creativeTerritoryDemoRequest.id,
      title: 'Mineral afterimage',
      creativeTerritory: { thesis: creativeTerritoryDemoRequest.thesis },
    })
    expect(state.creativeRoutes.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 'route-mineral', status: 'rejected' },
      { id: 'route-botanical', status: 'rejected' },
      { id: 'route-synthetic', status: 'approved' },
    ])
    expect(state.boardItems.find((item) => item.id === 'type-specimen-headline')?.hierarchyRole).toBeUndefined()
  })
})
