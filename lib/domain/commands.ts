import type {
  ActionReceipt,
  BoardItem,
  ColorPalette,
  CropRect,
  CommandErrorCode,
  CommandFailure,
  CommandResult,
  CommandSuccess,
  PlacementPolicy,
  Point,
  Proposal,
  ProposalStatus,
  UndoEffect,
  WorkspaceCommand,
  WorkspaceState,
} from './types'

const PROCESSED_COMMAND_LIMIT = 100
const AGENT_ADDITIONS_TERRITORY = 'Agent Additions'
const HEX = /^#[0-9A-F]{6}$/i
const validCrop = (crop: CropRect) => [crop.x, crop.y, crop.width, crop.height].every(Number.isFinite)
  && crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0
  && crop.x + crop.width <= 100 && crop.y + crop.height <= 100

function failure(state: WorkspaceState, code: CommandErrorCode, message: string): CommandFailure {
  return { ok: false, state, error: { code, message } }
}

function createReceipt(
  command: WorkspaceCommand,
  version: number,
  summary: string,
  undo?: UndoEffect,
  revertsReceiptId?: string,
): ActionReceipt {
  return {
    id: crypto.randomUUID(), action: command.type, actor: command.actor, version,
    timestamp: new Date().toISOString(), summary, undoable: Boolean(undo), undo, revertsReceiptId,
  }
}

function success(
  state: WorkspaceState,
  command: WorkspaceCommand,
  summary: string,
  undo?: UndoEffect,
  revertsReceiptId?: string,
): CommandSuccess {
  const receipt = createReceipt(command, state.version + 1, summary, undo, revertsReceiptId)
  const nextState: WorkspaceState = {
    ...state,
    version: state.version + 1,
    receipts: [receipt, ...state.receipts],
    processedCommands: [
      { idempotencyKey: command.idempotencyKey, receiptId: receipt.id },
      ...state.processedCommands,
    ].slice(0, PROCESSED_COMMAND_LIMIT),
  }
  return { ok: true, state: nextState, receipt }
}

function placementForProposal(proposal: Proposal, id: string, position: Point): BoardItem {
  return {
    id, title: proposal.title, kind: 'agent-addition', imageUrl: proposal.imageUrl,
    sourceUrl: proposal.sourceUrl, attribution: proposal.attribution, rightsStatus: proposal.rightsStatus,
    sourceProposalId: proposal.id, crop: proposal.crop, captureProvider: proposal.captureProvider,
    territory: proposal.intendedTerritory, position, width: 224, height: 286, locked: false,
  }
}

function withProposalStatus(state: WorkspaceState, proposalId: string, status: ProposalStatus): WorkspaceState {
  return { ...state, proposals: state.proposals.map((proposal) => proposal.id === proposalId ? { ...proposal, status } : proposal) }
}

function isColorPalette(value: ColorPalette): boolean {
  const validSwatch = (swatch: ColorPalette['pinned'][number]) => HEX.test(swatch.hex)
  return value.pinned.every(validSwatch)
    && (!value.extraction || (value.extraction.algorithm === 'iterum-pixel-quantize-v1' && value.extraction.colors.every(validSwatch)))
}

function applyUndoEffect(state: WorkspaceState, effect: UndoEffect): WorkspaceState {
  switch (effect.type) {
    case 'approval':
      return {
        ...withProposalStatus(state, effect.proposalId, effect.previousStatus),
        boardItems: state.boardItems.filter((item) => item.id !== effect.placedItemId),
      }
    case 'rejection':
      return withProposalStatus(state, effect.proposalId, effect.previousStatus)
    case 'proposal':
      return {
        ...state,
        proposals: state.proposals.filter((proposal) => proposal.id !== effect.proposalId),
        boardItems: effect.placedItemId ? state.boardItems.filter((item) => item.id !== effect.placedItemId) : state.boardItems,
      }
    case 'placement-policy':
      return { ...state, placementPolicy: effect.previous }
    case 'color-palette':
      return { ...state, colorPalette: effect.previous }
    case 'move':
      return {
        ...state,
        boardItems: state.boardItems.map((item) => item.id === effect.itemId ? { ...item, position: effect.previousPosition } : item),
      }
    case 'resize':
      return {
        ...state,
        boardItems: state.boardItems.map((item) => item.id === effect.itemId ? { ...item, width: effect.previousSize.width, height: effect.previousSize.height } : item),
      }
  }
}

function replay(state: WorkspaceState, idempotencyKey: string): CommandSuccess | undefined {
  const processed = state.processedCommands.find((entry) => entry.idempotencyKey === idempotencyKey)
  if (!processed) return undefined
  const receipt = state.receipts.find((entry) => entry.id === processed.receiptId)
  return receipt ? { ok: true, state, receipt } : undefined
}

/** Applies one versioned command without mutating the supplied canonical snapshot. */
export function applyWorkspaceCommand(state: WorkspaceState, command: WorkspaceCommand): CommandResult {
  const replayed = replay(state, command.idempotencyKey)
  if (replayed) return replayed
  if (command.campaignId !== state.campaign.id) return failure(state, 'CAMPAIGN_MISMATCH', 'Command campaign does not match this workspace.')
  if (command.boardId !== state.campaign.boardId) return failure(state, 'BOARD_MISMATCH', 'Command board does not match this workspace.')
  if (command.expectedVersion !== state.version) return failure(state, 'VERSION_CONFLICT', 'The board has changed; refresh and retry this action.')

  switch (command.type) {
    case 'approve-proposal': {
      if (command.actor === 'agent' && !state.placementPolicy.allowAgentDirectPlacement) {
        return failure(state, 'DIRECT_PLACEMENT_NOT_ALLOWED', 'Designer review is required before agent placement.')
      }
      const proposal = state.proposals.find((item) => item.id === command.proposalId)
      if (!proposal) return failure(state, 'PROPOSAL_NOT_FOUND', 'The proposal no longer exists.')
      if (proposal.status !== 'pending') return failure(state, 'PROPOSAL_NOT_PENDING', 'Only pending proposals can be approved.')
      const itemId = crypto.randomUUID()
      const placementTerritory = command.actor === 'agent' ? AGENT_ADDITIONS_TERRITORY : proposal.intendedTerritory
      const placedItem = placementForProposal({ ...proposal, intendedTerritory: placementTerritory }, itemId, command.position ?? { x: 1040, y: 120 })
      return success(
        { ...withProposalStatus(state, proposal.id, 'approved'), boardItems: [...state.boardItems, placedItem] },
        command,
        `Approved ${proposal.title} onto ${placementTerritory}.`,
        { type: 'approval', proposalId: proposal.id, previousStatus: proposal.status, placedItemId: itemId },
      )
    }
    case 'reject-proposal': {
      if (command.actor === 'agent') return failure(state, 'DESIGNER_REVIEW_REQUIRED', 'Only the designer can reject a proposal.')
      const proposal = state.proposals.find((item) => item.id === command.proposalId)
      if (!proposal) return failure(state, 'PROPOSAL_NOT_FOUND', 'The proposal no longer exists.')
      if (proposal.status !== 'pending') return failure(state, 'PROPOSAL_NOT_PENDING', 'Only pending proposals can be rejected.')
      return success(
        withProposalStatus(state, proposal.id, 'rejected'), command, `Rejected ${proposal.title}.`,
        { type: 'rejection', proposalId: proposal.id, previousStatus: proposal.status },
      )
    }
    case 'propose-reference': {
      const { directPlacement, position, ...proposalInput } = command.proposal
      if (proposalInput.crop && !validCrop(proposalInput.crop)) return failure(state, 'INVALID_REFERENCE', 'Reference crop coordinates must stay within the source image.')
      if (state.proposals.some((proposal) => proposal.id === proposalInput.id)) {
        return failure(state, 'PROPOSAL_NOT_PENDING', 'A proposal with this ID already exists.')
      }
      if (directPlacement && !state.placementPolicy.allowAgentDirectPlacement) {
        return failure(state, 'DIRECT_PLACEMENT_NOT_ALLOWED', 'Agent direct placement is not enabled for this board.')
      }
      const proposal: Proposal = { ...proposalInput, status: directPlacement ? 'approved' : 'pending' }
      if (!directPlacement) {
        return success(
          { ...state, proposals: [proposal, ...state.proposals] }, command, `Added ${proposal.title} to the Review Tray.`,
          { type: 'proposal', proposalId: proposal.id },
        )
      }
      const itemId = crypto.randomUUID()
      const placedItem = placementForProposal(
        { ...proposal, intendedTerritory: state.placementPolicy.directPlacementTerritory }, itemId, position ?? { x: 1040, y: 120 },
      )
      return success(
        { ...state, proposals: [proposal, ...state.proposals], boardItems: [...state.boardItems, placedItem] },
        command, `Placed ${proposal.title} in ${state.placementPolicy.directPlacementTerritory}.`,
        { type: 'proposal', proposalId: proposal.id, placedItemId: itemId },
      )
    }
    case 'set-placement-policy': {
      if (command.placementPolicy.directPlacementTerritory !== AGENT_ADDITIONS_TERRITORY) {
        return failure(state, 'INVALID_PLACEMENT_POLICY', `Direct placement is restricted to ${AGENT_ADDITIONS_TERRITORY}.`)
      }
      const nextPolicy: PlacementPolicy = { ...command.placementPolicy }
      return success(
        { ...state, placementPolicy: nextPolicy }, command, 'Updated the board placement policy.',
        { type: 'placement-policy', previous: state.placementPolicy },
      )
    }
    case 'set-color-palette': {
      if (!isColorPalette(command.colorPalette)) {
        return failure(state, 'INVALID_COLOR_PALETTE', 'A saved color palette must contain valid hexadecimal swatches.')
      }
      return success(
        { ...state, colorPalette: command.colorPalette }, command,
        command.colorPalette.extraction ? `Extracted ${command.colorPalette.extraction.colors.length} canonical colors from ${command.colorPalette.extraction.referenceLabel}.` : 'Updated the campaign color palette.',
        { type: 'color-palette', previous: state.colorPalette },
      )
    }
    case 'move-board-item': {
      const item = state.boardItems.find((candidate) => candidate.id === command.itemId)
      if (!item) return failure(state, 'BOARD_ITEM_NOT_FOUND', 'The board item no longer exists.')
      if (item.locked) return failure(state, 'LOCKED_REFERENCE', 'Locked references cannot be moved.')
      return success(
        { ...state, boardItems: state.boardItems.map((candidate) => candidate.id === item.id ? { ...candidate, position: { ...command.position } } : candidate) },
        command, `Moved ${item.title}.`, { type: 'move', itemId: item.id, previousPosition: item.position },
      )
    }
    case 'resize-board-item': {
      const item = state.boardItems.find((candidate) => candidate.id === command.itemId)
      if (!item) return failure(state, 'BOARD_ITEM_NOT_FOUND', 'The board item no longer exists.')
      if (item.locked) return failure(state, 'LOCKED_REFERENCE', 'Locked references cannot be resized.')
      return success(
        { ...state, boardItems: state.boardItems.map((candidate) => candidate.id === item.id ? { ...candidate, width: command.width, height: command.height } : candidate) },
        command, `Resized ${item.title}.`, { type: 'resize', itemId: item.id, previousSize: { width: item.width, height: item.height } },
      )
    }
    case 'undo-receipt': {
      const target = state.receipts.find((receipt) => receipt.id === command.receiptId)
      if (!target) return failure(state, 'RECEIPT_NOT_FOUND', 'The action receipt no longer exists.')
      if (!target.undoable || !target.undo || state.receipts.some((receipt) => receipt.revertsReceiptId === target.id)) {
        return failure(state, 'UNDO_UNAVAILABLE', 'This action can no longer be undone.')
      }
      if (command.actor === 'agent' && target.actor !== 'agent') return failure(state, 'DESIGNER_REVIEW_REQUIRED', 'An agent can only undo its own action receipts.')
      const compensated = applyUndoEffect(state, target.undo)
      return success(
        compensated, command, `Undid: ${target.summary}`, undefined, target.id,
      )
    }
  }
}
