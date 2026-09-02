export type Actor = 'designer' | 'agent' | 'system'

export type Point = { x: number; y: number }

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
