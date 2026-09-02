export type Actor = 'designer' | 'agent' | 'system'

export type Point = { x: number; y: number }
export type CropRect = { x: number; y: number; width: number; height: number }
export type CaptureProvider = 'microlink' | 'pexels' | 'manual' | 'web-clipper'
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
}

export interface BoardItem {
  id: string
  title: string
  kind: 'reference' | 'agent-addition'
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
  territory: string
  position: Point
  width: number
  height: number
  locked: boolean
}

export type RightsStatus = 'cleared' | 'reference-only' | 'uncertain'
export type ProposalStatus = 'pending' | 'approved' | 'rejected'

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
  status: ProposalStatus
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
  | { type: 'move'; itemId: string; previousPosition: Point }
  | { type: 'resize'; itemId: string; previousSize: { width: number; height: number } }

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
  version: number
  placementPolicy: PlacementPolicy
  colorPalette: ColorPalette
  typeDirection: TypeDirection | null
  typeProposals: TypeDirectionProposal[]
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
  | (CommandBase & { type: 'move-board-item'; itemId: string; position: Point })
  | (CommandBase & { type: 'resize-board-item'; itemId: string; width: number; height: number })
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
