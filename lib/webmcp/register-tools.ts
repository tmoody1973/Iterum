import type { WebMCPTool } from '../../types/webmcp'
import type { WorkspaceRuntime } from '../domain/workspace-runtime'
import type { Proposal, WorkspaceCommand, WorkspaceState } from '../domain/types'
import { failure, success, type RegisteredTools, type ToolResponse } from './types'

const requiredMutation = ['campaignId', 'boardId', 'expectedBoardVersion', 'idempotencyKey']
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const hasExactKeys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every((key) => allowed.includes(key))
const finitePoint = (value: unknown): value is { x: number; y: number } => isObject(value) && hasExactKeys(value, ['x', 'y']) && Number.isFinite(value.x) && Number.isFinite(value.y)

function isPublicHttpUrl(value: unknown) {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    const isIpv6 = host.includes(':')
    if (!host || host === 'localhost' || host.endsWith('.local') || host === '::1' || (isIpv6 && (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')))) return false
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipv4) {
      const octets = ipv4.slice(1).map(Number)
      if (octets.some((part) => part > 255) || octets[0] === 10 || octets[0] === 127 || octets[0] === 0 || octets[0] >= 224 || (octets[0] === 169 && octets[1] === 254) || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)) return false
    }
    return true
  } catch { return false }
}

function invalid(state: WorkspaceState, message: string) { return failure(state, 'VALIDATION_ERROR', message) }

function mutationInput(state: WorkspaceState, input: unknown): { value: Record<string, unknown> } | { response: ToolResponse<never> } {
  if (!isObject(input) || requiredMutation.some((key) => !(key in input))) return { response: invalid(state, `A mutation requires ${requiredMutation.join(', ')}.`) }
  if (typeof input.campaignId !== 'string' || typeof input.boardId !== 'string' || typeof input.expectedBoardVersion !== 'number' || !Number.isInteger(input.expectedBoardVersion) || input.expectedBoardVersion < 0 || typeof input.idempotencyKey !== 'string' || !input.idempotencyKey) return { response: invalid(state, 'Mutation identifiers and expectedBoardVersion are invalid.') }
  return { value: input }
}

function execute(runtime: WorkspaceRuntime, command: WorkspaceCommand): ToolResponse<{ receiptId: string }> {
  const result = runtime.dispatch(command)
  if (!result.ok) return failure(result.state, result.error.code, result.error.message, result.error.code === 'VERSION_CONFLICT')
  return success(result.state, { receiptId: result.receipt.id }, result.receipt.summary, result.receipt)
}

function parsedProposal(value: unknown): Omit<Proposal, 'status'> & { directPlacement?: boolean; position?: { x: number; y: number } } | null {
  const proposalKeys = ['id', 'title', 'imageUrl', 'sourceUrl', 'attribution', 'rightsStatus', 'rationale', 'intendedTerritory', 'directPlacement', 'position']
  if (!isObject(value) || !hasExactKeys(value, proposalKeys) || typeof value.id !== 'string' || !value.id || typeof value.title !== 'string' || !value.title || !isPublicHttpUrl(value.sourceUrl) || typeof value.attribution !== 'string' || !value.attribution || typeof value.rationale !== 'string' || !value.rationale || typeof value.intendedTerritory !== 'string' || !value.intendedTerritory || !['cleared', 'reference-only', 'uncertain'].includes(String(value.rightsStatus))) return null
  if (value.imageUrl !== undefined && !isPublicHttpUrl(value.imageUrl)) return null
  if (value.directPlacement !== undefined && typeof value.directPlacement !== 'boolean') return null
  if (value.position !== undefined && !finitePoint(value.position)) return null
  return { id: value.id, title: value.title, ...(typeof value.imageUrl === 'string' ? { imageUrl: value.imageUrl } : {}), sourceUrl: String(value.sourceUrl), attribution: value.attribution, rightsStatus: value.rightsStatus as Proposal['rightsStatus'], rationale: value.rationale, intendedTerritory: value.intendedTerritory, ...(typeof value.directPlacement === 'boolean' ? { directPlacement: value.directPlacement } : {}), ...(isObject(value.position) ? { position: { x: value.position.x as number, y: value.position.y as number } } : {}) }
}

const proposalProperties = {
  id: { type: 'string', minLength: 1 }, title: { type: 'string', minLength: 1 }, imageUrl: { type: 'string' }, sourceUrl: { type: 'string', minLength: 1 }, attribution: { type: 'string', minLength: 1 }, rightsStatus: { type: 'string', enum: ['cleared', 'reference-only', 'uncertain'] }, rationale: { type: 'string', minLength: 1 }, intendedTerritory: { type: 'string', minLength: 1 }, directPlacement: { type: 'boolean' }, position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'], additionalProperties: false },
}
const mutationProperties = { campaignId: { type: 'string' }, boardId: { type: 'string' }, expectedBoardVersion: { type: 'integer', minimum: 0 }, idempotencyKey: { type: 'string', minLength: 1 } }

export async function registerIterumTools(runtime: WorkspaceRuntime, controller = new AbortController()): Promise<RegisteredTools | null> {
  if (!document.modelContext) return null
  const tools: WebMCPTool[] = [
    {
      name: 'get_campaign_context', title: 'Read campaign context', description: 'Read the current Iterum campaign, board version, proposal queue, placement policy, and recent receipts without making changes.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId'])) return invalid(state, 'campaignId and boardId are the only accepted fields.'); if (input.campaignId !== state.campaign.id || input.boardId !== state.campaign.boardId) return failure(state, 'CAMPAIGN_MISMATCH', 'The requested campaign context is not open.'); return success(state, { campaign: state.campaign, placementPolicy: state.placementPolicy, proposals: state.proposals, receipts: state.receipts.slice(0, 8) }, `Read ${state.campaign.name} at board version ${state.version}.`) },
    },
    {
      name: 'propose_reference', title: 'Propose a sourced reference', description: 'Add a sourced reference to the Review Tray. Direct placement requires the designer policy and is constrained to Agent Additions.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, proposal: { type: 'object', properties: proposalProperties, required: ['id', 'title', 'sourceUrl', 'attribution', 'rightsStatus', 'rationale', 'intendedTerritory'], additionalProperties: false } }, required: [...requiredMutation, 'proposal'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (!hasExactKeys(checked.value, [...requiredMutation, 'proposal'])) return invalid(state, 'proposal is the only additional accepted field.'); const proposal = parsedProposal(checked.value.proposal); if (!proposal) return invalid(state, 'proposal must include valid sourced-reference fields and public http(s) URLs.'); return execute(runtime, { type: 'propose-reference', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposal }) },
    },
    {
      name: 'approve_reference', title: 'Approve a proposed reference', description: 'Place a pending reference only when the designer has enabled direct placement; agent placement is forced to Agent Additions.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, proposalId: { type: 'string', minLength: 1 }, position: proposalProperties.position }, required: [...requiredMutation, 'proposalId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (!hasExactKeys(checked.value, [...requiredMutation, 'proposalId', 'position']) || typeof checked.value.proposalId !== 'string' || !checked.value.proposalId || (checked.value.position !== undefined && !finitePoint(checked.value.position))) return invalid(state, 'proposalId and an optional finite x/y position are accepted.'); return execute(runtime, { type: 'approve-proposal', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposalId: checked.value.proposalId, ...(finitePoint(checked.value.position) ? { position: checked.value.position } : {}) }) },
    },
    {
      name: 'reject_reference', title: 'Request designer review for rejection', description: 'Request that the designer review a pending sourced reference for rejection. This tool never makes the designer’s rejection decision.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, proposalId: { type: 'string', minLength: 1 } }, required: [...requiredMutation, 'proposalId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (!hasExactKeys(checked.value, [...requiredMutation, 'proposalId']) || typeof checked.value.proposalId !== 'string' || !checked.value.proposalId) return invalid(state, 'proposalId is required.'); return failure(state, 'DESIGNER_REVIEW_REQUIRED', 'A designer must reject this proposal from the Review Tray.') },
    },
    {
      name: 'undo_action', title: 'Undo an action receipt', description: 'Create a compensating action for one currently undoable Iterum receipt.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, receiptId: { type: 'string', minLength: 1 } }, required: [...requiredMutation, 'receiptId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (!hasExactKeys(checked.value, [...requiredMutation, 'receiptId']) || typeof checked.value.receiptId !== 'string' || !checked.value.receiptId) return invalid(state, 'receiptId is required.'); const receipt = state.receipts.find((entry) => entry.id === checked.value.receiptId); if (receipt && receipt.actor !== 'agent') return failure(state, 'DESIGNER_REVIEW_REQUIRED', 'An agent can only undo its own action receipts.'); return execute(runtime, { type: 'undo-receipt', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', receiptId: checked.value.receiptId }) },
    },
  ]
  try { for (const tool of tools) await document.modelContext.registerTool(tool, { signal: controller.signal }) } catch (error) { controller.abort(); throw error }
  return { controller, count: tools.length }
}
