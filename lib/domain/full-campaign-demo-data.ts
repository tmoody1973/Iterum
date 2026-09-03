import type { WorkspaceState } from './types'

export function createFullCampaignDemoState(): WorkspaceState {
  return {
    campaign: {
      id: 'campaign-pivot-one', boardId: 'board-pivot-one', name: 'PIVOT / 01',
      line: 'A new campaign built from a blank board · Make light move.',
      brief: 'Launch a modular portable desk lamp for compact creative workspaces through a campaign that makes adjustment feel playful and exact.',
      deliverables: ['Launch poster', 'Instagram story', 'Landing-page hero', 'Retail display card', 'Client direction presentation'],
      constraints: ['Use only newly generated or newly sourced references', 'Preserve source and rights metadata', 'Require designer approval for agent proposals'],
      briefStatus: 'locked',
      creativeBrief: {
        objective: 'Introduce PIVOT / 01 as a useful piece of industrial design rather than decorative homeware.',
        audience: 'Independent designers and small-studio workers who value compact, adjustable objects.',
        proposition: 'Good light should change as quickly as the work does.',
        tone: ['rational', 'playful', 'graphic', 'precise'],
        mandatoryAssets: ['PIVOT / 01 name', 'Make light move.', 'Cobalt lamp product image'],
        antiDirections: ['Beige lifestyle minimalism', 'Soft Scandinavian domesticity', 'Futuristic technology clichés'],
        schedule: 'Direction review · October 08',
      },
    },
    version: 18,
    creativeRoutes: [
      { id: 'route-modular-signal', name: 'Modular signal', thesis: 'Cobalt geometry becomes a visual instruction: rotate, aim, work.', territory: 'Modular signal', palette: ['#073B9A', '#FFD51F', '#D12121', '#F1EFE9'], typography: 'Wide grotesk headlines with mono technical captions.', imageTreatment: 'Hard daylight, clean product edges, rhythmic architectural crops.', compositionPrinciples: ['Disc against grid', 'One red interruption', 'Visible modular rhythm'], status: 'approved', frame: { position: { x: 34, y: 44 }, width: 1042, height: 800 } },
      { id: 'route-object-theatre', name: 'Object theatre', thesis: 'The lamp behaves like a small character on a quiet architectural stage.', territory: 'Object theatre', palette: ['#143B82', '#E7E1D6', '#A01818'], typography: 'Humanist sans with small editorial captions.', imageTreatment: 'Long shadows, generous space, cinematic product gestures.', compositionPrinciples: ['Low horizon', 'Object as actor', 'Directional shadow'], status: 'rejected', frame: { position: { x: 34, y: 44 }, width: 1042, height: 800 } },
      { id: 'route-parts-manual', name: 'Parts manual', thesis: 'Every pivot and cylinder is treated as an intelligible component.', territory: 'Parts manual', palette: ['#F4F1E8', '#111111', '#1757C7'], typography: 'Monospaced labels and numbered grotesk display type.', imageTreatment: 'Isolated product views, exploded details, registration marks.', compositionPrinciples: ['Numbered sequence', 'Orthographic alignment', 'Functional annotation'], status: 'rejected', frame: { position: { x: 34, y: 44 }, width: 1042, height: 800 } },
    ],
    placementPolicy: { allowAgentDirectPlacement: false, directPlacementTerritory: 'Agent Additions' },
    colorPalette: {
      extraction: { referenceId: 'reference-pivot-product', referenceLabel: 'Cobalt pivot lamp / isolated', imageUrl: '/assets/pivot-lamp-product.png', crop: 'center', algorithm: 'iterum-pixel-quantize-v1', colors: [{ hex: '#073B9A', name: 'Pivot cobalt', source: 'local-extraction', role: 'extracted' }, { hex: '#F1EFE9', name: 'Studio paper', source: 'local-extraction', role: 'extracted' }, { hex: '#FFDC88', name: 'Lamp glow', source: 'local-extraction', role: 'extracted' }] },
      pinned: [{ hex: '#073B9A', name: 'Pivot cobalt', source: 'local-extraction', role: 'extracted' }, { hex: '#FFD51F', name: 'Signal yellow', source: 'the-color-api', role: 'systematic' }, { hex: '#D12121', name: 'Acrylic red', source: 'colormind', role: 'experimental' }, { hex: '#F1EFE9', name: 'Studio paper', source: 'local-extraction', role: 'extracted' }],
    },
    typeDirection: {
      id: 'type-pivot-approved', specimenText: 'Make light move.', rationale: 'Barlow gives the campaign a wide industrial voice; IBM Plex Mono keeps specifications readable and exact.',
      headline: { id: 'barlow', family: 'Barlow', category: 'sans-serif', source: 'fontsource', sourceLabel: 'Fontsource', license: 'OFL-1.1', referenceOnly: false, weights: [600, 700, 800], styles: ['normal'] },
      body: { id: 'ibm-plex-mono', family: 'IBM Plex Mono', category: 'monospace', source: 'fontsource', sourceLabel: 'Fontsource', license: 'OFL-1.1', referenceOnly: false, weights: [400, 500, 600], styles: ['normal'] },
    },
    typeProposals: [], layoutProposals: [],
    boardItems: [
      { id: 'reference-pivot-product', title: 'Cobalt pivot lamp / isolated', kind: 'reference', imageUrl: '/assets/pivot-lamp-product.png', territory: 'Modular signal', groupId: 'group-product', groupLabel: 'Product evidence', hierarchyRole: 'primary', hierarchyConfidence: 0.98, position: { x: 62, y: 104 }, width: 250, height: 322, locked: true, sourceUrl: 'generated://pivot/product-isolated', attribution: 'New Iterum campaign generation', rightsStatus: 'cleared', tags: ['cobalt lamp', 'modular object', 'anodized aluminum'], tagSuggestions: [] },
      { id: 'reference-perforated-rhythm', title: 'Perforated screen / shadow rhythm', kind: 'reference', imageUrl: '/assets/pivot-perforated-shadow.png', territory: 'Modular signal', groupId: 'group-rhythm', groupLabel: 'Graphic rhythm', hierarchyRole: 'supporting', hierarchyConfidence: 0.95, position: { x: 62, y: 454 }, width: 250, height: 286, locked: true, sourceUrl: 'generated://pivot/perforated-shadow', attribution: 'New Iterum campaign generation', rightsStatus: 'cleared', tags: ['perforation', 'signal yellow', 'repeated shadow'], tagSuggestions: [] },
      { id: 'reference-editorial-pivot', title: 'Pivot lamp / architectural still life', kind: 'reference', imageUrl: '/assets/pivot-editorial-still-life.png', territory: 'Modular signal', groupId: 'group-composition', groupLabel: 'Composition reference', hierarchyRole: 'supporting', hierarchyConfidence: 0.96, position: { x: 342, y: 104 }, width: 232, height: 304, locked: true, sourceUrl: 'generated://pivot/editorial-still-life', attribution: 'New Iterum campaign generation', rightsStatus: 'cleared', tags: ['hard daylight', 'red acrylic', 'architectural space'], tagSuggestions: [] },
      { id: 'campaign-proof-pivot', title: 'PIVOT / 01 launch poster', kind: 'campaign-proof', imageUrl: '/assets/pivot-editorial-still-life.png', territory: 'Modular signal', groupId: 'group-application', groupLabel: 'Campaign application', hierarchyRole: 'hero', hierarchyConfidence: 0.98, position: { x: 612, y: 104 }, width: 428, height: 520, locked: false, sourceUrl: 'generated://pivot/campaign-proof', attribution: 'Iterum composition from approved new assets', rightsStatus: 'cleared', tags: ['launch poster', 'campaign application'], tagSuggestions: [] },
      { id: 'type-pivot-headline', title: 'Headline: Make light move.', kind: 'type-specimen', typeRole: 'headline', territory: 'Modular signal', groupId: 'group-type', groupLabel: 'Typography system', hierarchyRole: 'primary', hierarchyConfidence: 0.97, position: { x: 342, y: 438 }, width: 232, height: 132, locked: false, sourceUrl: 'https://fontsource.org/fonts/barlow', attribution: 'Barlow · OFL-1.1', rightsStatus: 'cleared', tags: ['headline', '4:1 scale'], tagSuggestions: [] },
      { id: 'type-pivot-body', title: 'Body: ROTATE / AIM / WORK', kind: 'type-specimen', typeRole: 'body', territory: 'Modular signal', groupId: 'group-type', groupLabel: 'Typography system', hierarchyRole: 'supporting', hierarchyConfidence: 0.95, position: { x: 342, y: 590 }, width: 232, height: 122, locked: false, sourceUrl: 'https://fontsource.org/fonts/ibm-plex-mono', attribution: 'IBM Plex Mono · OFL-1.1', rightsStatus: 'cleared', tags: ['body', 'technical caption'], tagSuggestions: [] },
      { id: 'color-pivot', title: 'PIVOT campaign palette', kind: 'color-strip', territory: 'Modular signal', groupId: 'group-color', groupLabel: 'Campaign palette', hierarchyRole: 'supporting', hierarchyConfidence: 1, position: { x: 612, y: 650 }, width: 428, height: 28, locked: false, sourceUrl: 'generated://pivot/palette', attribution: 'Local extraction + systematic and experimental variations', rightsStatus: 'cleared', tags: ['cobalt', 'yellow', 'red', 'paper'], tagSuggestions: [] },
      { id: 'note-pivot-thesis', title: 'Direction thesis', kind: 'note', noteTone: 'blue', noteBody: 'COBALT OBJECT / REPEATED SHADOW / ONE RED INTERRUPTION. Show adjustment as a graphic action, never as a soft domestic scene.', territory: 'Modular signal', groupId: 'group-rationale', groupLabel: 'Direction rationale', hierarchyRole: 'supporting', hierarchyConfidence: 1, position: { x: 342, y: 738 }, width: 698, height: 76, locked: false, sourceUrl: 'generated://pivot/rationale', attribution: 'Agent rationale · designer approved', rightsStatus: 'cleared', tags: ['rationale', 'usage rule'], tagSuggestions: [] },
    ],
    proposals: [],
    receipts: [
      { id: 'receipt-territory', action: 'review-board-layout', actor: 'designer', version: 18, timestamp: '2026-09-02T18:00:00.000Z', summary: 'Approved Modular signal as the lead creative territory.', undoable: false },
      { id: 'receipt-type', action: 'review-type-direction', actor: 'designer', version: 17, timestamp: '2026-09-02T17:58:00.000Z', summary: 'Approved Barlow with IBM Plex Mono.', undoable: false },
      { id: 'receipt-color', action: 'set-color-palette', actor: 'designer', version: 16, timestamp: '2026-09-02T17:56:00.000Z', summary: 'Pinned the four-role PIVOT campaign palette.', undoable: false },
      { id: 'receipt-route', action: 'review-creative-route', actor: 'designer', version: 15, timestamp: '2026-09-02T17:54:00.000Z', summary: 'Selected Modular signal; rejected two alternate routes.', undoable: false },
    ],
    processedCommands: [],
  }
}
