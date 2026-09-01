import type { WorkspaceState } from './types'

export function createDemoWorkspaceState(): WorkspaceState {
  return {
    campaign: {
      id: 'campaign-static-bloom', boardId: 'board-static-bloom', name: 'Static Bloom', line: 'Fragrance direction workspace',
      brief: 'A tense floral fragrance campaign with tactile industrial contrast.',
      deliverables: ['Campaign direction board', 'Source-aware reference set', 'Direction brief'],
      constraints: ['Keep three client references locked', 'Review agent discoveries before placement'],
    },
    version: 3,
    placementPolicy: { allowAgentDirectPlacement: false, directPlacementTerritory: 'Agent Additions' },
    boardItems: [
      { id: 'reference-concrete', title: 'Wet concrete / sodium reflection', kind: 'reference', imageUrl: '/assets/ref-wet-concrete.webp', territory: 'Material tension', position: { x: 56, y: 62 }, width: 276, height: 356, locked: true, sourceUrl: 'local-demo', attribution: 'Iterum synthetic reference', rightsStatus: 'cleared' },
      { id: 'reference-resin-iris', title: 'Crushed iris in resin', kind: 'reference', imageUrl: '/assets/ref-resin-iris.webp', territory: 'Floral artifact', position: { x: 388, y: 92 }, width: 300, height: 352, locked: true, sourceUrl: 'local-demo', attribution: 'Iterum synthetic reference', rightsStatus: 'cleared' },
      { id: 'reference-type-study', title: 'Asymmetrical type study', kind: 'reference', imageUrl: '/assets/ref-type-study.webp', territory: 'Type pressure', position: { x: 736, y: 64 }, width: 252, height: 350, locked: true, sourceUrl: 'local-demo', attribution: 'Iterum synthetic reference', rightsStatus: 'cleared' },
    ],
    proposals: [
      { id: 'proposal-resin', title: 'Resin iris / violet fracture', imageUrl: '/assets/ref-resin-iris.webp', sourceUrl: 'https://iterum.demo/references/resin-iris', attribution: 'Iterum synthetic study', rightsStatus: 'cleared', rationale: 'Connects the floral note to a sharp, manufactured surface.', intendedTerritory: 'Floral artifact', status: 'pending' },
    ],
    receipts: [],
    processedCommands: [],
  }
}
