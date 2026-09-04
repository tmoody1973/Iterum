import type { WebMCPTool } from '../../types/webmcp'
import type { ColorPalette, ColorSwatch, WorkspaceCommand, WorkspaceState } from '../domain/types'
import type { WorkspaceRuntime } from '../domain/workspace-runtime'
import type { ProjectController, ReviewerGrantSession } from '../persistence/project-controller'
import { failure, success, type ToolResponse } from './types'

export interface WebMcpAgentSession {
  role: 'creative' | 'reviewer'
  sessionId: string
  reviewerGrant?: ReviewerGrantSession
}

type Input = Record<string, unknown>
type ReviewCommand = WorkspaceCommand extends infer Command
  ? Command extends WorkspaceCommand
    ? Omit<Command, 'campaignId' | 'boardId' | 'expectedVersion' | 'idempotencyKey' | 'actor' | 'proposerSessionId' | 'reviewerSessionId' | 'reviewRationale'>
    : never
  : never
type ReviewInput = {
  campaignId: string
  boardId: string
  expectedBoardVersion: number
  idempotencyKey: string
  proposerSessionId: string
  decision: 'approve' | 'reject'
  rationale: string
}

const mutationKeys = ['campaignId', 'boardId', 'expectedBoardVersion', 'idempotencyKey']
const reviewKeys = [...mutationKeys, 'proposerSessionId', 'decision', 'rationale']
const isObject = (value: unknown): value is Input => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const exact = (input: Input, allowed: string[]) => Object.keys(input).every((key) => allowed.includes(key))
const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9A-F]{6}$/i.test(value)

const reviewProperties = {
  campaignId: { type: 'string' },
  boardId: { type: 'string' },
  expectedBoardVersion: { type: 'integer', minimum: 0 },
  idempotencyKey: { type: 'string', minLength: 1, maxLength: 120 },
  proposerSessionId: { type: 'string', minLength: 3, maxLength: 120 },
  decision: { type: 'string', enum: ['approve', 'reject'] },
  rationale: { type: 'string', minLength: 12, maxLength: 500 },
}

function invalid(state: WorkspaceState, message: string) {
  return failure(state, 'VALIDATION_ERROR', message)
}

function parseReview(state: WorkspaceState, session: WebMcpAgentSession, input: unknown, extras: string[]): ReviewInput | ToolResponse<never> {
  if (session.role !== 'reviewer' || !session.reviewerGrant) return failure(state, 'REVIEWER_ROLE_REQUIRED', 'This tool is available only in an independent Reviewer Agent session with a valid reviewer pass.')
  if (!isObject(input) || !exact(input, [...reviewKeys, ...extras])) return invalid(state, `Provide only ${[...reviewKeys, ...extras].join(', ')}.`)
  if (input.campaignId !== state.campaign.id || input.boardId !== state.campaign.boardId || input.expectedBoardVersion !== state.version || typeof input.idempotencyKey !== 'string' || !input.idempotencyKey || typeof input.proposerSessionId !== 'string' || input.proposerSessionId.length < 3 || input.proposerSessionId !== session.reviewerGrant.creativeSessionId || input.proposerSessionId === session.sessionId || session.sessionId !== session.reviewerGrant.reviewerSessionId || !['approve', 'reject'].includes(String(input.decision)) || typeof input.rationale !== 'string' || input.rationale.trim().length < 12 || input.rationale.length > 500) {
    return failure(state, 'INVALID_REVIEW_SESSION', 'Review requires the current campaign and version, a distinct proposer session, a decision, and a concise rationale.', input.expectedBoardVersion !== state.version)
  }
  return {
    campaignId: input.campaignId as string,
    boardId: input.boardId as string,
    expectedBoardVersion: input.expectedBoardVersion as number,
    idempotencyKey: input.idempotencyKey,
    proposerSessionId: input.proposerSessionId,
    decision: input.decision as 'approve' | 'reject',
    rationale: input.rationale.trim(),
  }
}

async function authorizeReview(state: WorkspaceState, projectController: ProjectController, session: WebMcpAgentSession, action: string): Promise<ToolResponse<never> | null> {
  if (!session.reviewerGrant || !projectController.reviewerGrants) return failure(state, 'REVIEWER_ROLE_REQUIRED', 'Reviewer authorization is unavailable for this workspace.')
  try {
    await projectController.reviewerGrants.validate(session.reviewerGrant, action)
    return null
  } catch (error) {
    return failure(state, 'INVALID_REVIEWER_GRANT', error instanceof Error ? error.message : 'The reviewer pass is invalid or expired.')
  }
}

function isFailure(value: ReviewInput | ToolResponse<never>): value is ToolResponse<never> {
  return 'ok' in value
}

function dispatchReview(runtime: WorkspaceRuntime, session: WebMcpAgentSession, input: ReviewInput, command: ReviewCommand): ToolResponse<{ receiptId: string; reviewerSessionId: string; proposerSessionId: string }> {
  const result = runtime.dispatch({
    ...command,
    campaignId: input.campaignId,
    boardId: input.boardId,
    expectedVersion: input.expectedBoardVersion,
    idempotencyKey: input.idempotencyKey,
    actor: 'reviewer',
    proposerSessionId: input.proposerSessionId,
    reviewerSessionId: session.sessionId,
    reviewRationale: input.rationale,
  } as WorkspaceCommand)
  if (!result.ok) return failure(result.state, result.error.code, result.error.message, result.error.code === 'VERSION_CONFLICT')
  return success(result.state, { receiptId: result.receipt.id, reviewerSessionId: session.sessionId, proposerSessionId: input.proposerSessionId }, result.receipt.summary, result.receipt)
}

function parsedSwatches(value: unknown): ColorSwatch[] | null {
  if (!Array.isArray(value) || value.length < 3 || value.length > 8) return null
  const swatches = value.map((entry) => {
    if (!isObject(entry) || !exact(entry, ['hex', 'name', 'source', 'role']) || !isHex(entry.hex) || (entry.name !== undefined && (typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 80)) || !['local-extraction', 'the-color-api', 'colormind'].includes(String(entry.source)) || !['extracted', 'systematic', 'experimental'].includes(String(entry.role))) return null
    return { hex: entry.hex.toUpperCase(), ...(typeof entry.name === 'string' ? { name: entry.name.trim() } : {}), source: entry.source, role: entry.role } as ColorSwatch
  })
  return swatches.some((entry) => !entry) ? null : swatches as ColorSwatch[]
}

export function createReviewerTools(runtime: WorkspaceRuntime, session: WebMcpAgentSession, projectController: ProjectController): WebMCPTool[] {
  const reviewSchema = (extraProperties: Record<string, unknown>, extraRequired: string[]) => ({ type: 'object', properties: { ...reviewProperties, ...extraProperties }, required: [...reviewKeys, ...extraRequired], additionalProperties: false })
  return [
    {
      name: 'review_campaign_brief', title: 'Review and lock campaign brief', description: 'Approve and lock the current draft brief from an independent Reviewer Agent session. The creative proposer session cannot review its own brief.',
      inputSchema: reviewSchema({}, []), annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = parseReview(state, session, raw, [])
        if (isFailure(input)) return input
        const denied = await authorizeReview(state, projectController, session, 'review_campaign_brief'); if (denied) return denied
        if (input.decision !== 'approve') return failure(state, 'BRIEF_REJECTED', 'The reviewer rejected the draft. It remains editable and must be revised before lock.')
        return dispatchReview(runtime, session, input, { type: 'set-campaign-brief-lock', locked: true })
      },
    },
    {
      name: 'review_reference_proposal', title: 'Review sourced reference', description: 'Approve or reject one pending sourced reference from a separate Reviewer Agent session. Generated assets use review_generated_asset.',
      inputSchema: reviewSchema({ proposalId: { type: 'string', minLength: 1 }, position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'], additionalProperties: false } }, ['proposalId']), annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = parseReview(state, session, raw, ['proposalId', 'position'])
        if (isFailure(input)) return input
        const denied = await authorizeReview(state, projectController, session, 'review_reference_proposal'); if (denied) return denied
        const value = raw as Input; const proposal = typeof value.proposalId === 'string' ? state.proposals.find((item) => item.id === value.proposalId) : undefined
        if (!proposal || proposal.generation) return failure(state, 'PROPOSAL_NOT_FOUND', 'Provide one pending sourced-reference proposal. Generated assets use review_generated_asset.')
        const position = isObject(value.position) && Number.isFinite(value.position.x) && Number.isFinite(value.position.y) ? { x: value.position.x as number, y: value.position.y as number } : undefined
        return dispatchReview(runtime, session, input, input.decision === 'approve' ? { type: 'approve-proposal', proposalId: proposal.id, ...(position ? { position } : {}) } : { type: 'reject-proposal', proposalId: proposal.id })
      },
    },
    {
      name: 'review_generated_asset', title: 'Review generated asset', description: 'Approve or reject one pending generated candidate or application from a separate Reviewer Agent session.',
      inputSchema: reviewSchema({ proposalId: { type: 'string', minLength: 1 }, position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'], additionalProperties: false } }, ['proposalId']), annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = parseReview(state, session, raw, ['proposalId', 'position'])
        if (isFailure(input)) return input
        const denied = await authorizeReview(state, projectController, session, 'review_generated_asset'); if (denied) return denied
        const value = raw as Input; const proposal = typeof value.proposalId === 'string' ? state.proposals.find((item) => item.id === value.proposalId && item.generation) : undefined
        if (!proposal) return failure(state, 'PROPOSAL_NOT_FOUND', 'Provide one pending generated candidate or application proposal.')
        const position = isObject(value.position) && Number.isFinite(value.position.x) && Number.isFinite(value.position.y) ? { x: value.position.x as number, y: value.position.y as number } : undefined
        return dispatchReview(runtime, session, input, input.decision === 'approve' ? { type: 'approve-proposal', proposalId: proposal.id, ...(position ? { position } : {}) } : { type: 'reject-proposal', proposalId: proposal.id })
      },
    },
    {
      name: 'review_creative_route', title: 'Review creative route', description: 'Approve or reject one pending creative route from a separate Reviewer Agent session.',
      inputSchema: reviewSchema({ routeId: { type: 'string', minLength: 1 } }, ['routeId']), annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = parseReview(state, session, raw, ['routeId'])
        if (isFailure(input)) return input
        const denied = await authorizeReview(state, projectController, session, 'review_creative_route'); if (denied) return denied
        const routeId = (raw as Input).routeId
        if (typeof routeId !== 'string') return invalid(state, 'routeId is required.')
        return dispatchReview(runtime, session, input, { type: 'review-creative-route', routeId, decision: input.decision })
      },
    },
    {
      name: 'review_type_direction', title: 'Review type direction', description: 'Approve or reject one pending live type pairing from a separate Reviewer Agent session.',
      inputSchema: reviewSchema({ proposalId: { type: 'string', minLength: 1 } }, ['proposalId']), annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = parseReview(state, session, raw, ['proposalId'])
        if (isFailure(input)) return input
        const denied = await authorizeReview(state, projectController, session, 'review_type_direction'); if (denied) return denied
        const proposalId = (raw as Input).proposalId
        if (typeof proposalId !== 'string') return invalid(state, 'proposalId is required.')
        return dispatchReview(runtime, session, input, { type: 'review-type-direction', proposalId, decision: input.decision })
      },
    },
    {
      name: 'review_color_palette', title: 'Review campaign palette', description: 'Approve and pin a bounded campaign palette from a separate Reviewer Agent session. Color names should carry their intended campaign roles.',
      inputSchema: reviewSchema({ pinned: { type: 'array', minItems: 3, maxItems: 8, items: { type: 'object', properties: { hex: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }, name: { type: 'string', minLength: 1, maxLength: 80 }, source: { type: 'string', enum: ['local-extraction', 'the-color-api', 'colormind'] }, role: { type: 'string', enum: ['extracted', 'systematic', 'experimental'] } }, required: ['hex', 'source', 'role'], additionalProperties: false } } }, ['pinned']), annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = parseReview(state, session, raw, ['pinned'])
        if (isFailure(input)) return input
        const denied = await authorizeReview(state, projectController, session, 'review_color_palette'); if (denied) return denied
        if (input.decision !== 'approve') return failure(state, 'PALETTE_REJECTED', 'The reviewer rejected the palette. No campaign colors were changed.')
        const pinned = parsedSwatches((raw as Input).pinned)
        if (!pinned) return invalid(state, 'Provide 3–8 valid named campaign swatches with source and evidence role.')
        const colorPalette: ColorPalette = { extraction: state.colorPalette.extraction, pinned }
        return dispatchReview(runtime, session, input, { type: 'set-color-palette', colorPalette })
      },
    },
    {
      name: 'review_board_organization', title: 'Review board organization', description: 'Approve or reject one pending deterministic board-organization proposal from a separate Reviewer Agent session.',
      inputSchema: reviewSchema({ proposalId: { type: 'string', minLength: 1 } }, ['proposalId']), annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = parseReview(state, session, raw, ['proposalId'])
        if (isFailure(input)) return input
        const denied = await authorizeReview(state, projectController, session, 'review_board_organization'); if (denied) return denied
        const proposalId = (raw as Input).proposalId
        const proposal = typeof proposalId === 'string' ? state.layoutProposals.find((item) => item.id === proposalId && item.organization && !item.creativeTerritory) : undefined
        if (!proposal) return failure(state, 'BOARD_LAYOUT_NOT_FOUND', 'Provide one pending board-organization proposal. Creative territories use review_creative_territory.')
        return dispatchReview(runtime, session, input, { type: 'review-board-layout', proposalId: proposal.id, decision: input.decision })
      },
    },
    {
      name: 'review_creative_territory', title: 'Review creative territory', description: 'Approve or reject one pending creative-territory composition from a separate Reviewer Agent session.',
      inputSchema: reviewSchema({ proposalId: { type: 'string', minLength: 1 } }, ['proposalId']), annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = parseReview(state, session, raw, ['proposalId'])
        if (isFailure(input)) return input
        const denied = await authorizeReview(state, projectController, session, 'review_creative_territory'); if (denied) return denied
        const proposalId = (raw as Input).proposalId
        const proposal = typeof proposalId === 'string' ? state.layoutProposals.find((item) => item.id === proposalId && item.creativeTerritory) : undefined
        if (!proposal) return failure(state, 'BOARD_LAYOUT_NOT_FOUND', 'Provide one pending creative-territory proposal.')
        return dispatchReview(runtime, session, input, { type: 'review-board-layout', proposalId: proposal.id, decision: input.decision })
      },
    },
    {
      name: 'authorize_image_generation_quote', title: 'Authorize image-generation quote', description: 'Authorize one exact disclosed image-generation quote from a separate Reviewer Agent session. The authorization is bound to the creative session, generation idempotency key, fingerprint, and delegated ceiling.',
      inputSchema: { type: 'object', properties: { ...reviewProperties, decision: { type: 'string', const: 'approve' }, quoteFingerprint: { type: 'string', minLength: 1 }, generationIdempotencyKey: { type: 'string', minLength: 1, maxLength: 120 }, estimatedOutputUsd: { type: 'number', minimum: 0 }, costCeilingUsd: { type: 'number', minimum: 0 } }, required: [...reviewKeys, 'quoteFingerprint', 'generationIdempotencyKey', 'estimatedOutputUsd', 'costCeilingUsd'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = parseReview(state, session, raw, ['quoteFingerprint', 'generationIdempotencyKey', 'estimatedOutputUsd', 'costCeilingUsd'])
        if (isFailure(input)) return input
        const denied = await authorizeReview(state, projectController, session, 'authorize_image_generation_quote'); if (denied) return denied
        const value = raw as Input
        if (input.decision !== 'approve' || typeof value.quoteFingerprint !== 'string' || !value.quoteFingerprint || typeof value.generationIdempotencyKey !== 'string' || !value.generationIdempotencyKey || typeof value.estimatedOutputUsd !== 'number' || !Number.isFinite(value.estimatedOutputUsd) || typeof value.costCeilingUsd !== 'number' || !Number.isFinite(value.costCeilingUsd) || value.costCeilingUsd < value.estimatedOutputUsd) return failure(state, 'COST_APPROVAL_REQUIRED', 'Approve one exact quote whose estimated output cost does not exceed the delegated ceiling.')
        if (!session.reviewerGrant || !projectController.reviewerGrants || value.costCeilingUsd !== session.reviewerGrant.costCeilingUsd) return failure(state, 'COST_APPROVAL_REQUIRED', 'The request must use the exact delegated cost ceiling from the reviewer pass.')
        const costApproval = await projectController.reviewerGrants.authorizeCost(session.reviewerGrant, { quoteFingerprint: value.quoteFingerprint, generationIdempotencyKey: value.generationIdempotencyKey, estimatedOutputUsd: value.estimatedOutputUsd, rationale: input.rationale })
        const result = runtime.dispatch({ type: 'authorize-image-generation-quote', campaignId: input.campaignId, boardId: input.boardId, expectedVersion: input.expectedBoardVersion, idempotencyKey: input.idempotencyKey, actor: 'reviewer', proposerSessionId: input.proposerSessionId, reviewerSessionId: session.sessionId, reviewRationale: input.rationale, quoteFingerprint: value.quoteFingerprint, generationIdempotencyKey: value.generationIdempotencyKey, estimatedOutputUsd: value.estimatedOutputUsd, costCeilingUsd: value.costCeilingUsd })
        if (!result.ok) return failure(result.state, result.error.code, result.error.message, result.error.code === 'VERSION_CONFLICT')
        return success(result.state, { receiptId: result.receipt.id, costApproval }, result.receipt.summary, result.receipt)
      },
    },
  ]
}
