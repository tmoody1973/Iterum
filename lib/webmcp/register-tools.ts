import type { WebMCPTool } from '../../types/webmcp'
import type { WorkspaceRuntime } from '../domain/workspace-runtime'
import type { Proposal, WorkspaceCommand, WorkspaceState } from '../domain/types'
import { failure, success, type RegisteredTools, type ToolResponse } from './types'

const requiredMutation = ['campaignId', 'boardId', 'expectedBoardVersion', 'idempotencyKey']
const id = () => crypto.randomUUID()
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const isHttpUrl = (value: unknown) => typeof value === 'string' && /^https?:\/\//.test(value)

function invalid(state: WorkspaceState, message: string) { return failure(state, 'VALIDATION_ERROR', message) }

function mutationInput(state: WorkspaceState, input: unknown): { value: Record<string, unknown> } | { response: ToolResponse<never> } {
  if (!isObject(input) || requiredMutation.some((key) => !(key in input))) return { response: invalid(state, `A mutation requires ${requiredMutation.join(', ')}.`) }
  if (typeof input.campaignId !== 'string' || typeof input.boardId !== 'string' || !Number.isInteger(input.expectedBoardVersion) || typeof input.idempotencyKey !== 'string' || !input.idempotencyKey) return { response: invalid(state, 'Mutation identifiers and expectedBoardVersion are invalid.') }
  return { value: input }
}

function execute(runtime: WorkspaceRuntime, command: WorkspaceCommand): ToolResponse<{ receiptId: string }> {
  const result = runtime.dispatch(command)
  if (!result.ok) return failure(result.state, result.error.code, result.error.message, result.error.code === 'VERSION_CONFLICT')
  return success(result.state, { receiptId: result.receipt.id }, result.receipt.summary, result.receipt)
}

function parsedProposal(value: unknown): Omit<Proposal, 'status'> & { directPlacement?: boolean; position?: { x: number; y: number } } | null {
  if (!isObject(value) || typeof value.id !== 'string' || !value.id || typeof value.title !== 'string' || !value.title || !isHttpUrl(value.sourceUrl) || typeof value.attribution !== 'string' || !value.attribution || typeof value.rationale !== 'string' || !value.rationale || typeof value.intendedTerritory !== 'string' || !value.intendedTerritory || !['cleared', 'reference-only', 'uncertain'].includes(String(value.rightsStatus))) return null
  if (value.imageUrl !== undefined && !isHttpUrl(value.imageUrl)) return null
  if (value.directPlacement !== undefined && typeof value.directPlacement !== 'boolean') return null
  if (value.position !== undefined && (!isObject(value.position) || typeof value.position.x !== 'number' || typeof value.position.y !== 'number')) return null
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
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); if (!isObject(input) || input.campaignId !== state.campaign.id || input.boardId !== state.campaign.boardId) return failure(state, 'CAMPAIGN_MISMATCH', 'The requested campaign context is not open.'); return success(state, { campaign: state.campaign, placementPolicy: state.placementPolicy, proposals: state.proposals, receipts: state.receipts.slice(0, 8) }, `Read ${state.campaign.name} at board version ${state.version}.`) },
    },
    {
      name: 'propose_reference', title: 'Propose a sourced reference', description: 'Add a sourced reference to the Review Tray. Direct placement requires the designer policy and is constrained to Agent Additions.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, proposal: { type: 'object', properties: proposalProperties, required: ['id', 'title', 'sourceUrl', 'attribution', 'rightsStatus', 'rationale', 'intendedTerritory'], additionalProperties: false } }, required: [...requiredMutation, 'proposal'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; const proposal = parsedProposal(checked.value.proposal); if (!proposal) return invalid(state, 'proposal must include valid sourced-reference fields and http(s) URLs.'); return execute(runtime, { type: 'propose-reference', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposal }) },
    },
    {
      name: 'approve_reference', title: 'Approve a proposed reference', description: 'Approve one pending sourced reference and place it on its intended territory.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, proposalId: { type: 'string', minLength: 1 }, position: proposalProperties.position }, required: [...requiredMutation, 'proposalId'], additionalProperties: false }, annotations: { readOnlyHint: false },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (typeof checked.value.proposalId !== 'string') return invalid(state, 'proposalId is required.'); return execute(runtime, { type: 'approve-proposal', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposalId: checked.value.proposalId, ...(isObject(checked.value.position) ? { position: checked.value.position as { x: number; y: number } } : {}) }) },
    },
    {
      name: 'reject_reference', title: 'Reject a proposed reference', description: 'Record a rejection for one pending sourced reference without placing it on the board.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, proposalId: { type: 'string', minLength: 1 } }, required: [...requiredMutation, 'proposalId'], additionalProperties: false }, annotations: { readOnlyHint: false },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (typeof checked.value.proposalId !== 'string') return invalid(state, 'proposalId is required.'); return execute(runtime, { type: 'reject-proposal', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposalId: checked.value.proposalId }) },
    },
    {
      name: 'undo_action', title: 'Undo an action receipt', description: 'Create a compensating action for one currently undoable Iterum receipt.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, receiptId: { type: 'string', minLength: 1 } }, required: [...requiredMutation, 'receiptId'], additionalProperties: false }, annotations: { readOnlyHint: false },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (typeof checked.value.receiptId !== 'string') return invalid(state, 'receiptId is required.'); return execute(runtime, { type: 'undo-receipt', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', receiptId: checked.value.receiptId }) },
    },
  ]
  for (const tool of tools) await document.modelContext.registerTool(tool, { signal: controller.signal })
  return { controller, count: tools.length }
}
