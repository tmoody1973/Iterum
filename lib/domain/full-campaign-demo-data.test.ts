import { describe, expect, it } from 'vitest'

import { createFullCampaignDemoState } from './full-campaign-demo-data'

describe('full campaign review fixture', () => {
  it('is a complete, separate, source-aware campaign result', () => {
    const state = createFullCampaignDemoState()
    expect(state.campaign).toMatchObject({ id: 'campaign-pivot-one', name: 'PIVOT / 01', briefStatus: 'locked' })
    expect(state.campaign.deliverables).toHaveLength(5)
    expect(state.creativeRoutes.filter((route) => route.status === 'approved')).toHaveLength(1)
    expect(state.boardItems.filter((item) => item.locked)).toHaveLength(3)
    expect(state.boardItems.every((item) => item.sourceUrl && item.rightsStatus)).toBe(true)
    expect(state.boardItems.find((item) => item.hierarchyRole === 'hero')?.kind).toBe('campaign-proof')
    expect(state.typeDirection).toMatchObject({ headline: { family: 'Barlow' }, body: { family: 'IBM Plex Mono' } })
    expect(state.colorPalette.pinned).toHaveLength(4)
    expect(state.proposals).toHaveLength(0)
    expect(state.layoutProposals).toHaveLength(0)
    expect(state.boardItems.filter((item) => item.imageUrl).every((item) => item.imageUrl?.startsWith('/assets/pivot-'))).toBe(true)
    expect(state.boardItems.some((item) => item.imageUrl?.includes('ref-'))).toBe(false)
  })
})
