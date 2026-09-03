import { describe, expect, it } from 'vitest'

import { createOrganizedDemoWorkspaceState, organizedDemoRequest } from './organized-demo-data'

describe('organized demo state', () => {
  const overlaps = (a: { position: { x: number; y: number }; width: number; height: number }, b: { position: { x: number; y: number }; width: number; height: number }) =>
    a.position.x < b.position.x + b.width + 8 && a.position.x + a.width + 8 > b.position.x && a.position.y < b.position.y + b.height + 8 && a.position.y + a.height + 8 > b.position.y

  it('opens with the verified type hierarchy applied and the client reference untouched', () => {
    const state = createOrganizedDemoWorkspaceState()

    expect(state.layoutProposals).toContainEqual(expect.objectContaining({ id: organizedDemoRequest.id, status: 'approved' }))
    expect(state.boardItems.find((item) => item.id === 'type-specimen-headline')).toMatchObject({
      position: { x: 760, y: 432 }, width: 296, height: 184, groupLabel: 'Typography', hierarchyRole: 'hero',
    })
    expect(state.boardItems.find((item) => item.id === 'type-specimen-body')).toMatchObject({
      position: { x: 832, y: 632 }, width: 224, height: 128, groupLabel: 'Typography', hierarchyRole: 'primary',
    })
    expect(state.boardItems.find((item) => item.id === 'reference-type-study')).toMatchObject({
      position: { x: 736, y: 64 }, width: 252, height: 350, locked: true,
    })
    expect(state.boardItems.find((item) => item.id === 'reference-type-study')?.hierarchyRole).toBeUndefined()
    expect(state.receipts[0].summary).toContain('Applied organization proposal')

    const campaignProof = state.boardItems.find((item) => item.id === 'campaign-proof-static-bloom')!
    const resinReference = state.boardItems.find((item) => item.id === 'reference-resin-iris')!
    const typeItems = state.boardItems.filter((item) => item.territory === 'Type pressure')
    expect(overlaps(campaignProof, resinReference)).toBe(false)
    expect(typeItems.filter((item) => overlaps(campaignProof, item))).toEqual([])
  })
})
