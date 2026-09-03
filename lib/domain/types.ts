export type Actor = 'designer' | 'agent' | 'system'

export type Point = { x: number; y: number }
export type CropRect = { x: number; y: number; width: number; height: number }
export type CaptureProvider = 'microlink' | 'pexels' | 'manual' | 'web-clipper' | 'openai-image'
export type ReferenceTargetType = 'proposal' | 'board-item'
export type TagSuggestionStatus = 'pending' | 'approved' | 'rejected'
export type TypefaceSource = 'fontsource' | 'google-fonts' | 'commercial-reference'
export type TypefaceCategory = 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace'

export interface TypefaceCandidate {
  id: string
  family: string
  category: TypefaceCategory
  source: TypefaceSource
  sourceLabel: string
  license: string
  referenceOnly: boolean
  weights: number[]
  styles: string[]
  cssUrl?: string
  referenceUrl?: string
}

export interface TypeDirection {
  id: string
  headline: TypefaceCandidate
  body: TypefaceCandidate
  specimenText: string
  rationale: string
}

export interface TypeDirectionProposal extends TypeDirection {
  status: ProposalStatus
}

export interface TagSuggestion {
  id: string
  tags: string[]
  rationale: string
  status: TagSuggestionStatus
}

export interface ImageIsolation {
  sourceImageUrl: string
  imageDataUrl: string
  algorithm: 'iterum-border-matte-v1'
  sensitivity: number
  removedRatio: number
}

export interface Campaign {
  id: string
  boardId: string
  name: string
  line: string
  brief: string
  deliverables: string[]
  constraints: string[]
  briefStatus: 'draft' | 'locked'
  creativeBrief: CampaignBrief
}

export interface CampaignBrief {
  objective: string
  audience: string
  proposition: string
  tone: string[]
  mandatoryAssets: string[]
  antiDirections: string[]
  schedule: string
}

export interface CreativeRoute {
  id: string
  name: string
  thesis: string
  territory: string
  palette: string[]
  typography: string
  imageTreatment: string
  compositionPrinciples: string[]
  status: ProposalStatus
  frame: { position: Point; width: number; height: number }
}

export interface BoardItem {
  id: string
  title: string
  kind: 'reference' | 'agent-addition' | 'type-specimen' | 'note' | 'campaign-proof' | 'color-strip'
  typeRole?: 'headline' | 'body'
  noteBody?: string
  noteTone?: 'blue' | 'ruby' | 'paper'
  groupId?: string
  groupLabel?: string
  hierarchyRole?: HierarchyRole
  hierarchyConfidence?: number
  imageUrl?: string
  sourceUrl?: string
  attribution?: string
  rightsStatus?: RightsStatus
  sourceProposalId?: string
  crop?: CropRect
  captureProvider?: CaptureProvider
  isolation?: ImageIsolation
  originalImageUrl?: string
  tags?: string[]
  tagSuggestions?: TagSuggestion[]
  generation?: GeneratedImageLineage
  territory: string
  position: Point
  width: number
  height: number
  locked: boolean
}

export type RightsStatus = 'cleared' | 'reference-only' | 'uncertain'
export type ProposalStatus = 'pending' | 'approved' | 'rejected'
export type HierarchyRole = 'hero' | 'primary' | 'supporting'
export type BoardOrganizationStrategy = 'tag' | 'type'
export type BoardOrganizationRanking = 'visual-weight' | 'board-order'
export type BoardOrganizationScope =
  | { type: 'route'; routeId: string }
  | { type: 'territory'; territory: string }
  | { type: 'selection'; itemIds: string[] }
  | { type: 'whole-board' }

export interface BoardOrganizationRequest {
  id: string
  title: string
  scope: BoardOrganizationScope
  strategy: BoardOrganizationStrategy
  layout: 'cluster-grid'
  maximumGroups: number
  ranking: BoardOrganizationRanking
  briefKeywords?: string[]
}

export interface BoardOrganizationAssignment {
  itemId: string
  groupId: string
  groupLabel: string
  role: HierarchyRole
  confidence: number
  rationale: string
}

export interface BoardOrganizationGroup {
  id: string
  label: string
  itemIds: string[]
  heroItemId: string
  confidence: number
  rationale: string
}

export interface BoardOrganizationUnresolvedItem {
  itemId: string
  reason: string
}

export interface BoardOrganizationMetadata {
  origin: 'iterum-organize-v1'
  baselineBoardVersion: number
  scope: BoardOrganizationScope
  strategy: BoardOrganizationStrategy
  layout: 'cluster-grid'
  ranking: BoardOrganizationRanking
  maximumGroups: number
  groups: BoardOrganizationGroup[]
  assignments: BoardOrganizationAssignment[]
  unresolvedItems: BoardOrganizationUnresolvedItem[]
  untouchedLockedItemIds: string[]
}

export type CreativeTerritoryDensity = 'restrained' | 'balanced' | 'dense'
export type CreativeTerritoryContribution = 'image-treatment' | 'composition' | 'materiality'
export type CreativeTerritoryPaletteRole = 'ground' | 'accent' | 'support' | 'type'
export type CreativeTerritoryRelationshipKind = 'contrast' | 'echo' | 'sequence' | 'material-bridge'

export interface CreativeTerritoryRequest {
  id: string
  title: string
  routeId: string
  thesis: string
  mood: string
  density: CreativeTerritoryDensity
  groupingSignals: string[]
  references: Array<{ itemId: string; contribution: CreativeTerritoryContribution; annotation: string }>
  hierarchy: { heroItemId: string; primaryItemIds: string[]; supportingItemIds: string[] }
  typography: { headlineItemId: string; bodyItemId: string; relationship: string; scaleRatio: number }
  palette: Array<{ hex: string; name: string; role: CreativeTerritoryPaletteRole }>
  relationships: Array<{ fromItemId: string; toItemId: string; kind: CreativeTerritoryRelationshipKind; rationale: string }>
  application: { itemId: string; format: string; caption: string }
}

export interface CreativeTerritoryMetadata extends CreativeTerritoryRequest {
  origin: 'iterum-creative-territory-v1'
  baselineBoardVersion: number
}

export interface BoardLayoutChange {
  itemId: string
  position?: Point
  width?: number
  height?: number
  locked?: boolean
  territory?: string
  groupId?: string
  groupLabel?: string
  hierarchyRole?: HierarchyRole
  hierarchyConfidence?: number
}

export interface BoardNoteDraft {
  id: string
  title: string
  body: string
  tone: 'blue' | 'ruby' | 'paper'
  territory: string
  position: Point
  width: number
  height: number
}

export interface BoardLayoutProposal {
  id: string
  title: string
  rationale: string
  changes: BoardLayoutChange[]
  notes: BoardNoteDraft[]
  organization?: BoardOrganizationMetadata
  creativeTerritory?: CreativeTerritoryMetadata
  status: ProposalStatus
}

export interface Proposal {
  id: string
  title: string
  imageUrl?: string
  sourceUrl: string
  attribution: string
  rightsStatus: RightsStatus
  rationale: string
  intendedTerritory: string
  crop?: CropRect
  captureProvider?: CaptureProvider
  isolation?: ImageIsolation
  tags?: string[]
  tagSuggestions?: TagSuggestion[]
  generation?: GeneratedImageLineage
  status: ProposalStatus
}

export interface GeneratedImageLineage {
  origin: 'generated'
  runKey: string
  assetKey: string
  parentAssetKey?: string
  version: number
  model: 'gpt-image-2'
  prompt: string
  purpose: string
  referenceItemIds: string[]
  width: number
  height: number
  createdAt: number
  applicationFormat?: 'poster-4:5' | 'story-9:16' | 'landing-hero-16:9' | 'square-1:1'
  rasterTextCanonical: false
}

export interface PlacementPolicy {
  allowAgentDirectPlacement: boolean
  directPlacementTerritory: string
}

export type ColorSource = 'local-extraction' | 'the-color-api' | 'colormind'
export type ColorRole = 'extracted' | 'systematic' | 'experimental'

export interface ColorSwatch {
  hex: string
  name?: string
  source: ColorSource
  role: ColorRole
}

export interface ColorExtraction {
  referenceId: string
  referenceLabel: string
  imageUrl: string
  crop: 'full' | 'center'
  algorithm: 'iterum-pixel-quantize-v1'
  colors: ColorSwatch[]
}

export interface ColorPalette {
  extraction: ColorExtraction | null
  pinned: ColorSwatch[]
}

export type UndoEffect =
  | { type: 'approval'; proposalId: string; previousStatus: ProposalStatus; placedItemId: string }
  | { type: 'rejection'; proposalId: string; previousStatus: ProposalStatus }
  | { type: 'proposal'; proposalId: string; placedItemId?: string }
  | { type: 'placement-policy'; previous: PlacementPolicy }
  | { type: 'color-palette'; previous: ColorPalette }
  | { type: 'proposal-isolation'; proposalId: string; previous?: ImageIsolation }
  | { type: 'tag-suggestion'; targetType: ReferenceTargetType; referenceId: string; suggestionId: string }
  | { type: 'tag-decision'; targetType: ReferenceTargetType; referenceId: string; suggestionId: string; previousStatus: TagSuggestionStatus; previousTags: string[] }
  | { type: 'type-direction-proposal'; proposalId: string }
  | { type: 'type-direction-decision'; proposalId: string; previousStatus: ProposalStatus; previousDirection: TypeDirection | null }
  | { type: 'board-layout-proposal'; proposalId: string }
  | { type: 'board-layout-decision'; proposalId: string; previousStatus: ProposalStatus; previousItems: BoardItem[]; addedItemIds: string[] }
  | { type: 'move'; itemId: string; previousPosition: Point }
  | { type: 'resize'; itemId: string; previousSize: { width: number; height: number } }
  | { type: 'lock'; itemId: string; previousLocked: boolean }
  | { type: 'campaign-brief'; previousCampaign: Campaign }
  | { type: 'campaign-brief-lock'; previousStatus: Campaign['briefStatus'] }
  | { type: 'creative-routes-proposal'; routeIds: string[] }
  | { type: 'creative-route-decision'; routeId: string; previousStatus: ProposalStatus }

export interface ActionReceipt {
  id: string
  action: WorkspaceCommand['type']
  actor: Actor
  version: number
  timestamp: string
  summary: string
  undoable: boolean
  undo?: UndoEffect
  revertsReceiptId?: string
}

export interface ProcessedCommand {
  idempotencyKey: string
  receiptId: string
}

export interface WorkspaceState {
  campaign: Campaign
  creativeRoutes: CreativeRoute[]
  version: number
  placementPolicy: PlacementPolicy
  colorPalette: ColorPalette
  typeDirection: TypeDirection | null
  typeProposals: TypeDirectionProposal[]
  layoutProposals: BoardLayoutProposal[]
  boardItems: BoardItem[]
  proposals: Proposal[]
  receipts: ActionReceipt[]
  processedCommands: ProcessedCommand[]
}

interface CommandBase {
  campaignId: string
  boardId: string
  expectedVersion: number
  idempotencyKey: string
  actor: Actor
}

export type WorkspaceCommand =
  | (CommandBase & { type: 'approve-proposal'; proposalId: string; position?: Point })
  | (CommandBase & { type: 'reject-proposal'; proposalId: string })
  | (CommandBase & {
      type: 'propose-reference'
      proposal: Omit<Proposal, 'status'> & { directPlacement?: boolean; position?: Point }
    })
  | (CommandBase & { type: 'set-placement-policy'; placementPolicy: PlacementPolicy })
  | (CommandBase & { type: 'set-color-palette'; colorPalette: ColorPalette })
  | (CommandBase & { type: 'set-proposal-isolation'; proposalId: string; isolation: ImageIsolation | null })
  | (CommandBase & { type: 'propose-reference-tags'; targetType: ReferenceTargetType; referenceId: string; suggestion: Omit<TagSuggestion, 'status'> })
  | (CommandBase & { type: 'review-reference-tags'; targetType: ReferenceTargetType; referenceId: string; suggestionId: string; decision: 'approve' | 'reject' })
  | (CommandBase & { type: 'propose-type-direction'; proposal: Omit<TypeDirectionProposal, 'status'> })
  | (CommandBase & { type: 'review-type-direction'; proposalId: string; decision: 'approve' | 'reject' })
  | (CommandBase & { type: 'propose-board-layout'; proposal: Omit<BoardLayoutProposal, 'status'> })
  | (CommandBase & { type: 'propose-board-organization'; request: BoardOrganizationRequest })
  | (CommandBase & { type: 'review-board-layout'; proposalId: string; decision: 'approve' | 'reject' })
  | (CommandBase & { type: 'move-board-item'; itemId: string; position: Point })
  | (CommandBase & { type: 'resize-board-item'; itemId: string; width: number; height: number })
  | (CommandBase & { type: 'set-board-item-lock'; itemId: string; locked: boolean })
  | (CommandBase & { type: 'update-campaign-brief'; name: string; line: string; brief: CampaignBrief })
  | (CommandBase & { type: 'set-campaign-brief-lock'; locked: boolean })
  | (CommandBase & { type: 'propose-creative-routes'; routes: Array<Omit<CreativeRoute, 'status'>> })
  | (CommandBase & { type: 'review-creative-route'; routeId: string; decision: 'approve' | 'reject' })
  | (CommandBase & { type: 'undo-receipt'; receiptId: string })

export type CommandErrorCode =
  | 'VERSION_CONFLICT'
  | 'CAMPAIGN_MISMATCH'
  | 'BOARD_MISMATCH'
  | 'PROPOSAL_NOT_FOUND'
  | 'PROPOSAL_NOT_PENDING'
  | 'BOARD_ITEM_NOT_FOUND'
  | 'LOCKED_REFERENCE'
  | 'DIRECT_PLACEMENT_NOT_ALLOWED'
  | 'INVALID_PLACEMENT_POLICY'
  | 'INVALID_COLOR_PALETTE'
  | 'INVALID_REFERENCE'
  | 'INVALID_TAGS'
  | 'TAG_SUGGESTION_NOT_FOUND'
  | 'TAG_SUGGESTION_NOT_PENDING'
  | 'TYPE_DIRECTION_NOT_FOUND'
  | 'TYPE_DIRECTION_NOT_PENDING'
  | 'INVALID_TYPE_DIRECTION'
  | 'BOARD_LAYOUT_NOT_FOUND'
  | 'BOARD_LAYOUT_NOT_PENDING'
  | 'INVALID_BOARD_LAYOUT'
  | 'INVALID_BOARD_ORGANIZATION'
  | 'BOARD_ORGANIZATION_EMPTY'
  | 'STALE_BOARD_ORGANIZATION'
  | 'BRIEF_LOCKED'
  | 'INVALID_CAMPAIGN_BRIEF'
  | 'CREATIVE_ROUTE_NOT_FOUND'
  | 'CREATIVE_ROUTE_NOT_PENDING'
  | 'INVALID_CREATIVE_ROUTES'
  | 'RECEIPT_NOT_FOUND'
  | 'UNDO_UNAVAILABLE'
  | 'DESIGNER_REVIEW_REQUIRED'

export interface CommandSuccess {
  ok: true
  state: WorkspaceState
  receipt: ActionReceipt
}

export interface CommandFailure {
  ok: false
  state: WorkspaceState
  error: { code: CommandErrorCode; message: string }
}

export type CommandResult = CommandSuccess | CommandFailure
