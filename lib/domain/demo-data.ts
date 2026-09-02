import type { WorkspaceState } from './types'

export function createDemoWorkspaceState(): WorkspaceState {
  return {
    campaign: {
      id: 'campaign-static-bloom', boardId: 'board-static-bloom', name: 'Static Bloom', line: 'Fragrance direction workspace',
      brief: 'A tense floral fragrance campaign with tactile industrial contrast.',
      deliverables: ['Campaign direction board', 'Source-aware reference set', 'Direction brief'],
      constraints: ['Keep three client references locked', 'Review agent discoveries before placement'],
      briefStatus: 'locked',
      creativeBrief: {
        objective: 'Launch a fictional fragrance through one memorable, art-directed visual system.',
        audience: 'Design-conscious fragrance buyers who value materiality over conventional luxury cues.',
        proposition: 'A floral scent can feel mineral, tense, and electrically alive.',
        tone: ['tactile', 'severe', 'strange', 'warm'],
        mandatoryAssets: ['Static Bloom wordmark', 'Fragrance bottle', 'Launch line: The air remembers.'],
        antiDirections: ['Generic clean beauty', 'Soft romantic florals', 'Literal botanical illustration'],
        schedule: 'Direction review · May 20',
      },
    },
    version: 3,
    creativeRoutes: [
      { id: 'route-mineral', name: 'Mineral severity', thesis: 'Cold structure cut by one sodium flare.', territory: 'Material tension', palette: ['#171717', '#D18A0E', '#D0C7BA'], typography: 'Compressed grotesk with restrained mono data.', imageTreatment: 'Hard crop, wet specular detail, near-black tonal floor.', compositionPrinciples: ['Severe verticals', 'One hot interruption', 'Generous dead space'], status: 'pending', frame: { position: { x: 34, y: 44 }, width: 330, height: 800 } },
      { id: 'route-botanical', name: 'Botanical fracture', thesis: 'A preserved bloom treated as evidence, not decoration.', territory: 'Floral artifact', palette: ['#4B263B', '#BBA885', '#171717'], typography: 'Editorial serif tension against utilitarian labels.', imageTreatment: 'Translucent layers, resin distortion, magnified organic fragments.', compositionPrinciples: ['Specimen scale', 'Overlapping evidence', 'Off-axis captions'], status: 'pending', frame: { position: { x: 390, y: 44 }, width: 330, height: 800 } },
      { id: 'route-synthetic', name: 'Synthetic warmth', thesis: 'Industrial heat made intimate through paper, amber, and skin.', territory: 'Type pressure', palette: ['#E1B86A', '#A05040', '#171717'], typography: 'Overscaled condensed display type under physical pressure.', imageTreatment: 'Warm grain, imperfect registration, tactile print density.', compositionPrinciples: ['Type as image', 'Asymmetric pressure', 'Visible production marks'], status: 'pending', frame: { position: { x: 746, y: 44 }, width: 330, height: 800 } },
    ],
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
