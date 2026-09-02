import type {
  ActionReceipt,
  BoardItem,
  ColorPalette,
  CropRect,
  ImageIsolation,
  CommandErrorCode,
  CommandFailure,
  CommandResult,
  CommandSuccess,
  PlacementPolicy,
  Point,
  Proposal,
  ProposalStatus,
  ReferenceTargetType,
  TagSuggestion,
  TypeDirection,
  TypefaceCandidate,
  UndoEffect,
  WorkspaceCommand,
  WorkspaceState,
} from './types'

const PROCESSED_COMMAND_LIMIT = 100
const AGENT_ADDITIONS_TERRITORY = 'Agent Additions'
const HEX = /^#[0-9A-F]{6}$/i
const TAG = /^[\p{L}\p{N}][\p{L}\p{N}\s&+./-]{0,31}$/u
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
    id, title: proposal.title, kind: 'agent-addition', imageUrl: proposal.isolation?.imageDataUrl ?? proposal.imageUrl,
    sourceUrl: proposal.sourceUrl, attribution: proposal.attribution, rightsStatus: proposal.rightsStatus,
    sourceProposalId: proposal.id, crop: proposal.crop, captureProvider: proposal.captureProvider,
    isolation: proposal.isolation, originalImageUrl: proposal.isolation ? proposal.imageUrl : undefined,
    tags: proposal.tags ?? [], tagSuggestions: [],
    territory: proposal.intendedTerritory, position, width: 224, height: 286, locked: false,
  }
}

type TaggableReference = Proposal | BoardItem

function findReference(state: WorkspaceState, targetType: ReferenceTargetType, referenceId: string): TaggableReference | undefined {
  return targetType === 'proposal' ? state.proposals.find((item) => item.id === referenceId) : state.boardItems.find((item) => item.id === referenceId)
}

function updateReference(state: WorkspaceState, targetType: ReferenceTargetType, referenceId: string, update: (reference: TaggableReference) => TaggableReference): WorkspaceState {
  return targetType === 'proposal'
    ? { ...state, proposals: state.proposals.map((item) => item.id === referenceId ? update(item) as Proposal : item) }
    : { ...state, boardItems: state.boardItems.map((item) => item.id === referenceId ? update(item) as BoardItem : item) }
}

function normalizedTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean))]
}

function validTags(tags: string[]) {
  const normalized = normalizedTags(tags)
  return normalized.length >= 1 && normalized.length <= 8 && normalized.every((tag) => TAG.test(tag))
}

const TYPEFACE_SOURCES = ['fontsource', 'google-fonts', 'commercial-reference']
const TYPEFACE_CATEGORIES = ['serif', 'sans-serif', 'display', 'handwriting', 'monospace']
function validTypeface(value: TypefaceCandidate) {
  return Boolean(value.id.trim() && value.family.trim() && value.sourceLabel.trim() && value.license.trim())
    && TYPEFACE_SOURCES.includes(value.source) && TYPEFACE_CATEGORIES.includes(value.category)
    && Array.isArray(value.weights) && value.weights.length > 0 && value.weights.every((weight) => Number.isInteger(weight) && weight >= 100 && weight <= 900)
    && Array.isArray(value.styles) && value.styles.length > 0 && value.styles.every((style) => ['normal', 'italic'].includes(style))
    && (value.source !== 'commercial-reference' || value.referenceOnly)
    && (value.cssUrl === undefined || /^https:\/\//.test(value.cssUrl))
}

function validTypeDirection(value: TypeDirection) {
  return Boolean(value.id.trim() && value.specimenText.trim() && value.specimenText.length <= 180 && value.rationale.trim() && value.rationale.length <= 320)
    && validTypeface(value.headline) && validTypeface(value.body)
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
    case 'proposal-isolation':
      return { ...state, proposals: state.proposals.map((proposal) => proposal.id === effect.proposalId ? { ...proposal, isolation: effect.previous } : proposal) }
    case 'tag-suggestion':
      return updateReference(state, effect.targetType, effect.referenceId, (reference) => ({ ...reference, tagSuggestions: (reference.tagSuggestions ?? []).filter((suggestion) => suggestion.id !== effect.suggestionId) }))
    case 'tag-decision':
      return updateReference(state, effect.targetType, effect.referenceId, (reference) => ({ ...reference, tags: effect.previousTags, tagSuggestions: (reference.tagSuggestions ?? []).map((suggestion) => suggestion.id === effect.suggestionId ? { ...suggestion, status: effect.previousStatus } : suggestion) }))
    case 'type-direction-proposal':
      return { ...state, typeProposals: state.typeProposals.filter((proposal) => proposal.id !== effect.proposalId) }
    case 'type-direction-decision':
      return { ...state, typeDirection: effect.previousDirection, typeProposals: state.typeProposals.map((proposal) => proposal.id === effect.proposalId ? { ...proposal, status: effect.previousStatus } : proposal) }
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
    case 'set-proposal-isolation': {
      if (command.actor === 'agent') return failure(state, 'DESIGNER_REVIEW_REQUIRED', 'Only the designer can commit an isolated image derivative.')
      const proposal = state.proposals.find((item) => item.id === command.proposalId)
      if (!proposal) return failure(state, 'PROPOSAL_NOT_FOUND', 'The proposal no longer exists.')
      if (proposal.status !== 'pending') return failure(state, 'PROPOSAL_NOT_PENDING', 'Only pending proposals can change their image derivative.')
      if (!proposal.imageUrl) return failure(state, 'INVALID_REFERENCE', 'This proposal has no source image to isolate.')
      const isolation: ImageIsolation | undefined = command.isolation ?? undefined
      if (isolation && (isolation.sourceImageUrl !== proposal.imageUrl || isolation.algorithm !== 'iterum-border-matte-v1' || !isolation.imageDataUrl.startsWith('data:image/png;base64,') || !Number.isFinite(isolation.sensitivity) || isolation.sensitivity < 0 || isolation.sensitivity > 100 || !Number.isFinite(isolation.removedRatio) || isolation.removedRatio < 0 || isolation.removedRatio > 1)) return failure(state, 'INVALID_REFERENCE', 'The image isolation derivative is invalid.')
      return success(
        { ...state, proposals: state.proposals.map((item) => item.id === proposal.id ? { ...item, isolation } : item) }, command,
        isolation ? `Isolated ${proposal.title} from its background locally.` : `Restored the original image for ${proposal.title}.`,
        { type: 'proposal-isolation', proposalId: proposal.id, previous: proposal.isolation },
      )
    }
    case 'propose-reference-tags': {
      const reference = findReference(state, command.targetType, command.referenceId)
      if (!reference) return failure(state, 'BOARD_ITEM_NOT_FOUND', 'The reference no longer exists.')
      if (!validTags(command.suggestion.tags) || !command.suggestion.id || !command.suggestion.rationale.trim()) return failure(state, 'INVALID_TAGS', 'Tag suggestions require 1–8 short tags and a rationale.')
      if ((reference.tagSuggestions ?? []).some((suggestion) => suggestion.id === command.suggestion.id)) return failure(state, 'INVALID_TAGS', 'This tag suggestion already exists.')
      const suggestion: TagSuggestion = { ...command.suggestion, tags: normalizedTags(command.suggestion.tags), rationale: command.suggestion.rationale.trim(), status: 'pending' }
      return success(
        updateReference(state, command.targetType, reference.id, (item) => ({ ...item, tagSuggestions: [suggestion, ...(item.tagSuggestions ?? [])] })), command,
        `Proposed ${suggestion.tags.length} tags for ${reference.title}.`,
        { type: 'tag-suggestion', targetType: command.targetType, referenceId: reference.id, suggestionId: suggestion.id },
      )
    }
    case 'review-reference-tags': {
      if (command.actor === 'agent') return failure(state, 'DESIGNER_REVIEW_REQUIRED', 'Only the designer can approve or reject tag suggestions.')
      const reference = findReference(state, command.targetType, command.referenceId)
      if (!reference) return failure(state, 'BOARD_ITEM_NOT_FOUND', 'The reference no longer exists.')
      const suggestion = (reference.tagSuggestions ?? []).find((item) => item.id === command.suggestionId)
      if (!suggestion) return failure(state, 'TAG_SUGGESTION_NOT_FOUND', 'The tag suggestion no longer exists.')
      if (suggestion.status !== 'pending') return failure(state, 'TAG_SUGGESTION_NOT_PENDING', 'Only pending tag suggestions can be reviewed.')
      const previousTags = reference.tags ?? []
      const nextTags = command.decision === 'approve' ? normalizedTags([...previousTags, ...suggestion.tags]) : previousTags
      return success(
        updateReference(state, command.targetType, reference.id, (item) => ({ ...item, tags: nextTags, tagSuggestions: (item.tagSuggestions ?? []).map((entry) => entry.id === suggestion.id ? { ...entry, status: command.decision === 'approve' ? 'approved' : 'rejected' } : entry) })), command,
        `${command.decision === 'approve' ? 'Approved' : 'Rejected'} tag suggestion for ${reference.title}.`,
        { type: 'tag-decision', targetType: command.targetType, referenceId: reference.id, suggestionId: suggestion.id, previousStatus: suggestion.status, previousTags },
      )
    }
    case 'propose-type-direction': {
      if (!validTypeDirection(command.proposal)) return failure(state, 'INVALID_TYPE_DIRECTION', 'Type directions require valid headline and body faces, specimen copy, and a rationale.')
      if (state.typeProposals.some((proposal) => proposal.id === command.proposal.id)) return failure(state, 'INVALID_TYPE_DIRECTION', 'This type direction already exists.')
      const proposal = { ...command.proposal, specimenText: command.proposal.specimenText.trim(), rationale: command.proposal.rationale.trim(), status: 'pending' as const }
      return success(
        { ...state, typeProposals: [proposal, ...state.typeProposals] }, command,
        `Added ${proposal.headline.family} + ${proposal.body.family} to type review.`,
        { type: 'type-direction-proposal', proposalId: proposal.id },
      )
    }
    case 'review-type-direction': {
      if (command.actor === 'agent') return failure(state, 'DESIGNER_REVIEW_REQUIRED', 'Only the designer can approve or reject a type direction.')
      const proposal = state.typeProposals.find((item) => item.id === command.proposalId)
      if (!proposal) return failure(state, 'TYPE_DIRECTION_NOT_FOUND', 'The type direction no longer exists.')
      if (proposal.status !== 'pending') return failure(state, 'TYPE_DIRECTION_NOT_PENDING', 'Only pending type directions can be reviewed.')
      const nextDirection: TypeDirection | null = command.decision === 'approve'
        ? { id: proposal.id, headline: proposal.headline, body: proposal.body, specimenText: proposal.specimenText, rationale: proposal.rationale }
        : state.typeDirection
      return success(
        { ...state, typeDirection: nextDirection, typeProposals: state.typeProposals.map((item) => item.id === proposal.id ? { ...item, status: command.decision === 'approve' ? 'approved' : 'rejected' } : item) }, command,
        `${command.decision === 'approve' ? 'Approved' : 'Rejected'} ${proposal.headline.family} + ${proposal.body.family}.`,
        { type: 'type-direction-decision', proposalId: proposal.id, previousStatus: proposal.status, previousDirection: state.typeDirection },
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
