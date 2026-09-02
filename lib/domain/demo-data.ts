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
    colorPalette: {
      extraction: null,
      pinned: [
        { hex: '#4779B8', name: 'Non-photo blue', source: 'local-extraction', role: 'extracted' },
        { hex: '#A05040', name: 'Review ruby', source: 'local-extraction', role: 'extracted' },
      ],
    },
    typeDirection: null,
    typeProposals: [],
    layoutProposals: [],
    boardItems: [
      { id: 'reference-concrete', title: 'Wet concrete / sodium reflection', kind: 'reference', imageUrl: '/assets/ref-wet-concrete.webp', territory: 'Material tension', position: { x: 56, y: 62 }, width: 276, height: 356, locked: true, sourceUrl: 'local-demo', attribution: 'Iterum synthetic reference', rightsStatus: 'cleared', tags: ['wet surface', 'amber light', 'industrial'], tagSuggestions: [] },
      { id: 'reference-resin-iris', title: 'Crushed iris in resin', kind: 'reference', imageUrl: '/assets/ref-resin-iris.webp', territory: 'Floral artifact', position: { x: 388, y: 92 }, width: 300, height: 352, locked: true, sourceUrl: 'local-demo', attribution: 'Iterum synthetic reference', rightsStatus: 'cleared', tags: ['botanical', 'resin', 'violet'], tagSuggestions: [] },
      { id: 'reference-type-study', title: 'Asymmetrical type study', kind: 'reference', imageUrl: '/assets/ref-type-study.webp', territory: 'Type pressure', position: { x: 736, y: 64 }, width: 252, height: 350, locked: true, sourceUrl: 'local-demo', attribution: 'Iterum synthetic reference', rightsStatus: 'cleared', tags: ['condensed type', 'asymmetry', 'editorial'], tagSuggestions: [] },
      { id: 'campaign-proof-static-bloom', title: 'Static Bloom campaign proof', kind: 'campaign-proof', imageUrl: '/assets/ref-resin-iris.webp', territory: 'Campaign proof', position: { x: 335, y: 164 }, width: 450, height: 540, locked: false, sourceUrl: 'local-demo', attribution: 'Iterum campaign composition', rightsStatus: 'cleared', tags: ['campaign proof', 'composition'], tagSuggestions: [] },
      { id: 'color-strip-static-bloom', title: 'Campaign color control strip', kind: 'color-strip', territory: 'Color system', position: { x: 335, y: 728 }, width: 450, height: 28, locked: false, sourceUrl: 'local-demo', attribution: 'Iterum campaign palette', rightsStatus: 'cleared', tags: ['palette', 'color control'], tagSuggestions: [] },
      { id: 'type-specimen-headline', title: 'Headline type specimen', kind: 'type-specimen', typeRole: 'headline', territory: 'Type pressure', position: { x: 790, y: 448 }, width: 286, height: 178, locked: false, sourceUrl: 'local-demo', attribution: 'Approved Iterum type direction', rightsStatus: 'cleared', tags: ['headline', 'type specimen'], tagSuggestions: [] },
      { id: 'type-specimen-body', title: 'Body type specimen', kind: 'type-specimen', typeRole: 'body', territory: 'Type pressure', position: { x: 790, y: 646 }, width: 286, height: 166, locked: false, sourceUrl: 'local-demo', attribution: 'Approved Iterum type direction', rightsStatus: 'cleared', tags: ['body copy', 'type specimen'], tagSuggestions: [] },
    ],
    proposals: [
      { id: 'proposal-resin', title: 'Resin iris / violet fracture', imageUrl: '/assets/ref-resin-iris.webp', sourceUrl: 'https://iterum.demo/references/resin-iris', attribution: 'Iterum synthetic study', rightsStatus: 'cleared', rationale: 'Connects the floral note to a sharp, manufactured surface.', intendedTerritory: 'Floral artifact', tags: ['botanical'], tagSuggestions: [{ id: 'tag-suggestion-resin', tags: ['violet fracture', 'encapsulation', 'tactile floral'], rationale: 'Links the crushed iris subject to manufactured material tension.', status: 'pending' }], status: 'pending' },
    ],
    receipts: [],
    processedCommands: [],
  }
}
