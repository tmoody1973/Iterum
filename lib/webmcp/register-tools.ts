import type { WebMCPTool } from '../../types/webmcp'
import { boundsForItems, fitBounds, itemIntersectsBounds, visibleWorldBounds, viewportCenter, viewportFromCenter, type BoardViewportController } from '../board/viewport'
import { projectBoardLayout } from '../domain/board-layout'
import { createCreativeTerritoryProposal } from '../domain/creative-territory'
import { extractPaletteFromImage } from '../color/browser-extraction'
import type { WorkspaceRuntime } from '../domain/workspace-runtime'
import type { BoardLayoutProposal, BoardNoteDraft, BoardOrganizationRequest, BoardOrganizationScope, CampaignBrief, CreativeRoute, CreativeTerritoryRequest, Proposal, TypeDirection, TypefaceCandidate, WorkspaceCommand, WorkspaceState } from '../domain/types'
import { isolateImageBackground } from '../image/isolate-background'
import type { ProjectController } from '../persistence/project-controller'
import { isPublicHttpUrl } from '../references/public-url'
import { failure, success, type RegisteredTools, type ToolResponse } from './types'
import { createImageGenerationTools } from './register-image-generation-tools'

const requiredMutation = ['campaignId', 'boardId', 'expectedBoardVersion', 'idempotencyKey']
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const hasExactKeys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every((key) => allowed.includes(key))
const finitePoint = (value: unknown): value is { x: number; y: number } => isObject(value) && hasExactKeys(value, ['x', 'y']) && Number.isFinite(value.x) && Number.isFinite(value.y)
const typefaceKeys = ['id', 'family', 'category', 'source', 'sourceLabel', 'license', 'referenceOnly', 'weights', 'styles', 'cssUrl', 'referenceUrl']

export interface ReviewUiController {
  previewLayoutProposal(id: string | null): void
  openReview(): void
}

export type BoardDisplayMode = 'working' | 'presentation'

export interface PresentationUiState {
  mode: BoardDisplayMode
  selectedItemId: string | null
  previewProposalId: string | null
  workspaceMode: 'mechanical' | 'layers' | 'history'
  activeTool: 'select' | 'crop' | 'color' | 'type' | 'organize' | 'annotate'
  drawers: { brief: boolean; review: boolean }
}

export interface PresentationUiController {
  getDisplayState(): PresentationUiState
  setDisplayMode(mode: BoardDisplayMode): void
  preparePresentation(): void
}

function parsedTypeface(value: unknown): TypefaceCandidate | null {
  if (!isObject(value) || !hasExactKeys(value, typefaceKeys) || typeof value.id !== 'string' || !value.id || typeof value.family !== 'string' || !value.family || !['serif', 'sans-serif', 'display', 'handwriting', 'monospace'].includes(String(value.category)) || !['fontsource', 'google-fonts', 'commercial-reference'].includes(String(value.source)) || typeof value.sourceLabel !== 'string' || !value.sourceLabel || typeof value.license !== 'string' || !value.license || typeof value.referenceOnly !== 'boolean' || !Array.isArray(value.weights) || !value.weights.length || !value.weights.every((weight) => Number.isInteger(weight) && Number(weight) >= 100 && Number(weight) <= 900) || !Array.isArray(value.styles) || !value.styles.length || !value.styles.every((style) => ['normal', 'italic'].includes(String(style))) || (value.cssUrl !== undefined && !isPublicHttpUrl(value.cssUrl)) || (value.referenceUrl !== undefined && !isPublicHttpUrl(value.referenceUrl)) || (value.source === 'commercial-reference' && !value.referenceOnly)) return null
  return value as unknown as TypefaceCandidate
}

function parsedTypeDirection(value: unknown): Omit<TypeDirection, 'id'> & { id: string } | null {
  if (!isObject(value) || !hasExactKeys(value, ['id', 'headline', 'body', 'specimenText', 'rationale']) || typeof value.id !== 'string' || !value.id || typeof value.specimenText !== 'string' || !value.specimenText.trim() || value.specimenText.length > 180 || typeof value.rationale !== 'string' || !value.rationale.trim() || value.rationale.length > 320) return null
  const headline = parsedTypeface(value.headline); const body = parsedTypeface(value.body)
  return headline && body ? { id: value.id, headline, body, specimenText: value.specimenText.trim(), rationale: value.rationale.trim() } : null
}

const layoutChangeKeys = ['itemId', 'position', 'width', 'height', 'locked', 'territory', 'groupId', 'groupLabel']
const noteKeys = ['id', 'title', 'body', 'tone', 'territory', 'position', 'width', 'height']

function parsedBoardNote(value: unknown): BoardNoteDraft | null {
  if (!isObject(value) || !hasExactKeys(value, noteKeys) || typeof value.id !== 'string' || !value.id || typeof value.title !== 'string' || !value.title.trim() || typeof value.body !== 'string' || !value.body.trim() || !['blue', 'ruby', 'paper'].includes(String(value.tone)) || typeof value.territory !== 'string' || !value.territory.trim() || !finitePoint(value.position) || typeof value.width !== 'number' || !Number.isFinite(value.width) || typeof value.height !== 'number' || !Number.isFinite(value.height)) return null
  return { id: value.id, title: value.title, body: value.body, tone: value.tone as BoardNoteDraft['tone'], territory: value.territory, position: value.position, width: value.width, height: value.height }
}

function parsedBoardLayout(value: unknown): Omit<BoardLayoutProposal, 'status'> | null {
  if (!isObject(value) || !hasExactKeys(value, ['id', 'title', 'rationale', 'changes', 'notes']) || typeof value.id !== 'string' || !value.id || typeof value.title !== 'string' || !value.title.trim() || typeof value.rationale !== 'string' || !value.rationale.trim() || !Array.isArray(value.changes) || !Array.isArray(value.notes) || value.changes.length + value.notes.length < 1 || value.changes.length > 30 || value.notes.length > 12) return null
  const changes = value.changes.map((change) => {
    if (!isObject(change) || !hasExactKeys(change, layoutChangeKeys) || typeof change.itemId !== 'string' || !change.itemId || (change.position !== undefined && !finitePoint(change.position)) || (change.width !== undefined && (typeof change.width !== 'number' || !Number.isFinite(change.width))) || (change.height !== undefined && (typeof change.height !== 'number' || !Number.isFinite(change.height))) || (change.locked !== undefined && typeof change.locked !== 'boolean') || (change.territory !== undefined && (typeof change.territory !== 'string' || !change.territory.trim())) || (change.groupId !== undefined && (typeof change.groupId !== 'string' || !change.groupId.trim())) || (change.groupLabel !== undefined && (typeof change.groupLabel !== 'string' || !change.groupLabel.trim()))) return null
    return { itemId: change.itemId, ...(finitePoint(change.position) ? { position: change.position } : {}), ...(typeof change.width === 'number' ? { width: change.width } : {}), ...(typeof change.height === 'number' ? { height: change.height } : {}), ...(typeof change.locked === 'boolean' ? { locked: change.locked } : {}), ...(typeof change.territory === 'string' ? { territory: change.territory } : {}), ...(typeof change.groupId === 'string' ? { groupId: change.groupId } : {}), ...(typeof change.groupLabel === 'string' ? { groupLabel: change.groupLabel } : {}) }
  })
  if (changes.some((change) => !change)) return null
  const notes = value.notes.map(parsedBoardNote)
  if (notes.some((note) => !note)) return null
  return { id: value.id, title: value.title, rationale: value.rationale, changes: changes as Omit<BoardLayoutProposal, 'status'>['changes'], notes: notes as BoardNoteDraft[] }
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
  const proposalKeys = ['id', 'title', 'imageUrl', 'sourceUrl', 'attribution', 'rightsStatus', 'rationale', 'intendedTerritory', 'crop', 'captureProvider', 'directPlacement', 'position']
  if (!isObject(value) || !hasExactKeys(value, proposalKeys) || typeof value.id !== 'string' || !value.id || typeof value.title !== 'string' || !value.title || !isPublicHttpUrl(value.sourceUrl) || typeof value.attribution !== 'string' || !value.attribution || typeof value.rationale !== 'string' || !value.rationale || typeof value.intendedTerritory !== 'string' || !value.intendedTerritory || !['cleared', 'reference-only', 'uncertain'].includes(String(value.rightsStatus))) return null
  if (value.imageUrl !== undefined && !isPublicHttpUrl(value.imageUrl)) return null
  const crop = value.crop
  if (crop !== undefined && (!isObject(crop) || !hasExactKeys(crop, ['x', 'y', 'width', 'height']) || ![crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) || (crop.x as number) < 0 || (crop.y as number) < 0 || (crop.width as number) <= 0 || (crop.height as number) <= 0 || (crop.x as number) + (crop.width as number) > 100 || (crop.y as number) + (crop.height as number) > 100)) return null
  if (value.captureProvider !== undefined && !['microlink', 'pexels', 'manual', 'web-clipper'].includes(String(value.captureProvider))) return null
  if (value.directPlacement !== undefined && typeof value.directPlacement !== 'boolean') return null
  if (value.position !== undefined && !finitePoint(value.position)) return null
  return { id: value.id, title: value.title, ...(typeof value.imageUrl === 'string' ? { imageUrl: value.imageUrl } : {}), sourceUrl: String(value.sourceUrl), attribution: value.attribution, rightsStatus: value.rightsStatus as Proposal['rightsStatus'], rationale: value.rationale, intendedTerritory: value.intendedTerritory, ...(isObject(crop) ? { crop: { x: crop.x as number, y: crop.y as number, width: crop.width as number, height: crop.height as number } } : {}), ...(typeof value.captureProvider === 'string' ? { captureProvider: value.captureProvider as Proposal['captureProvider'] } : {}), ...(typeof value.directPlacement === 'boolean' ? { directPlacement: value.directPlacement } : {}), ...(isObject(value.position) ? { position: { x: value.position.x as number, y: value.position.y as number } } : {}) }
}

const cropProperties = { type: 'object', properties: { x: { type: 'number', minimum: 0, maximum: 100 }, y: { type: 'number', minimum: 0, maximum: 100 }, width: { type: 'number', exclusiveMinimum: 0, maximum: 100 }, height: { type: 'number', exclusiveMinimum: 0, maximum: 100 } }, required: ['x', 'y', 'width', 'height'], additionalProperties: false }
const proposalProperties = {
  id: { type: 'string', minLength: 1 }, title: { type: 'string', minLength: 1 }, imageUrl: { type: 'string' }, sourceUrl: { type: 'string', minLength: 1 }, attribution: { type: 'string', minLength: 1 }, rightsStatus: { type: 'string', enum: ['cleared', 'reference-only', 'uncertain'] }, rationale: { type: 'string', minLength: 1 }, intendedTerritory: { type: 'string', minLength: 1 }, crop: cropProperties, captureProvider: { type: 'string', enum: ['microlink', 'pexels', 'manual', 'web-clipper'] }, directPlacement: { type: 'boolean' }, position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'], additionalProperties: false },
}
const typefaceProperties = { id: { type: 'string', minLength: 1 }, family: { type: 'string', minLength: 1 }, category: { type: 'string', enum: ['serif', 'sans-serif', 'display', 'handwriting', 'monospace'] }, source: { type: 'string', enum: ['fontsource', 'google-fonts', 'commercial-reference'] }, sourceLabel: { type: 'string', minLength: 1 }, license: { type: 'string', minLength: 1 }, referenceOnly: { type: 'boolean' }, weights: { type: 'array', items: { type: 'integer', minimum: 100, maximum: 900 }, minItems: 1 }, styles: { type: 'array', items: { type: 'string', enum: ['normal', 'italic'] }, minItems: 1 }, cssUrl: { type: 'string' }, referenceUrl: { type: 'string' } }
const pointProperties = { type: 'object', properties: { x: { type: 'number', minimum: -5000, maximum: 5000 }, y: { type: 'number', minimum: -5000, maximum: 5000 } }, required: ['x', 'y'], additionalProperties: false }
const layoutChangeProperties = { type: 'object', properties: { itemId: { type: 'string', minLength: 1, maxLength: 80 }, position: pointProperties, width: { type: 'number', minimum: 80, maximum: 1200 }, height: { type: 'number', minimum: 16, maximum: 1200 }, locked: { type: 'boolean' }, territory: { type: 'string', minLength: 1, maxLength: 80 }, groupId: { type: 'string', minLength: 1, maxLength: 80 }, groupLabel: { type: 'string', minLength: 1, maxLength: 80 } }, required: ['itemId'], additionalProperties: false }
const boardNoteProperties = { type: 'object', properties: { id: { type: 'string', minLength: 1, maxLength: 80 }, title: { type: 'string', minLength: 1, maxLength: 120 }, body: { type: 'string', minLength: 1, maxLength: 500 }, tone: { type: 'string', enum: ['blue', 'ruby', 'paper'] }, territory: { type: 'string', minLength: 1, maxLength: 80 }, position: pointProperties, width: { type: 'number', minimum: 140, maximum: 800 }, height: { type: 'number', minimum: 100, maximum: 800 } }, required: ['id', 'title', 'body', 'tone', 'territory', 'position', 'width', 'height'], additionalProperties: false }
const boardLayoutProperties = { type: 'object', properties: { id: { type: 'string', minLength: 1, maxLength: 80 }, title: { type: 'string', minLength: 1, maxLength: 120 }, rationale: { type: 'string', minLength: 1, maxLength: 320 }, changes: { type: 'array', items: layoutChangeProperties, maxItems: 30 }, notes: { type: 'array', items: boardNoteProperties, maxItems: 12 } }, required: ['id', 'title', 'rationale', 'changes', 'notes'], additionalProperties: false }
const briefProperties = { type: 'object', properties: { objective: { type: 'string', minLength: 1, maxLength: 500 }, audience: { type: 'string', minLength: 1, maxLength: 500 }, proposition: { type: 'string', minLength: 1, maxLength: 500 }, tone: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 120 }, minItems: 1, maxItems: 8 }, mandatoryAssets: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 120 }, minItems: 1, maxItems: 12 }, antiDirections: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 120 }, minItems: 1, maxItems: 12 }, schedule: { type: 'string', minLength: 1, maxLength: 160 } }, required: ['objective', 'audience', 'proposition', 'tone', 'mandatoryAssets', 'antiDirections', 'schedule'], additionalProperties: false }
const routeFrameProperties = { type: 'object', properties: { position: pointProperties, width: { type: 'number', minimum: 260, maximum: 1200 }, height: { type: 'number', minimum: 320, maximum: 1200 } }, required: ['position', 'width', 'height'], additionalProperties: false }
const creativeRouteProperties = { type: 'object', properties: { id: { type: 'string', minLength: 1, maxLength: 80 }, name: { type: 'string', minLength: 1, maxLength: 120 }, thesis: { type: 'string', minLength: 1, maxLength: 320 }, territory: { type: 'string', minLength: 1, maxLength: 80 }, palette: { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }, minItems: 2, maxItems: 6 }, typography: { type: 'string', minLength: 1, maxLength: 320 }, imageTreatment: { type: 'string', minLength: 1, maxLength: 320 }, compositionPrinciples: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 120 }, minItems: 1, maxItems: 6 }, frame: routeFrameProperties }, required: ['id', 'name', 'thesis', 'territory', 'palette', 'typography', 'imageTreatment', 'compositionPrinciples', 'frame'], additionalProperties: false }
const organizationScopeProperties = { oneOf: [
  { type: 'object', properties: { type: { const: 'route' }, routeId: { type: 'string', minLength: 1, maxLength: 80 } }, required: ['type', 'routeId'], additionalProperties: false },
  { type: 'object', properties: { type: { const: 'territory' }, territory: { type: 'string', minLength: 1, maxLength: 80 } }, required: ['type', 'territory'], additionalProperties: false },
  { type: 'object', properties: { type: { const: 'selection' }, itemIds: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 80 }, minItems: 1, maxItems: 200, uniqueItems: true } }, required: ['type', 'itemIds'], additionalProperties: false },
  { type: 'object', properties: { type: { const: 'whole-board' } }, required: ['type'], additionalProperties: false },
] }
const organizationProperties = { type: 'object', properties: { id: { type: 'string', minLength: 1, maxLength: 80 }, title: { type: 'string', minLength: 1, maxLength: 120 }, scope: organizationScopeProperties, strategy: { type: 'string', enum: ['tag', 'type'] }, layout: { type: 'string', const: 'cluster-grid' }, maximumGroups: { type: 'integer', minimum: 1, maximum: 6 }, ranking: { type: 'string', enum: ['visual-weight', 'board-order'] }, briefKeywords: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 80 }, maxItems: 8 } }, required: ['id', 'title', 'scope', 'strategy', 'layout', 'maximumGroups', 'ranking'], additionalProperties: false }
const territoryReferenceProperties = { type: 'object', properties: { itemId: { type: 'string', minLength: 1, maxLength: 80 }, contribution: { type: 'string', enum: ['image-treatment', 'composition', 'materiality'] }, annotation: { type: 'string', minLength: 1, maxLength: 240 } }, required: ['itemId', 'contribution', 'annotation'], additionalProperties: false }
const territoryHierarchyProperties = { type: 'object', properties: { heroItemId: { type: 'string', minLength: 1, maxLength: 80 }, primaryItemIds: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 80 }, maxItems: 4, uniqueItems: true }, supportingItemIds: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 80 }, maxItems: 8, uniqueItems: true } }, required: ['heroItemId', 'primaryItemIds', 'supportingItemIds'], additionalProperties: false }
const territoryTypographyProperties = { type: 'object', properties: { headlineItemId: { type: 'string', minLength: 1, maxLength: 80 }, bodyItemId: { type: 'string', minLength: 1, maxLength: 80 }, relationship: { type: 'string', minLength: 1, maxLength: 240 }, scaleRatio: { type: 'number', minimum: 1, maximum: 12 } }, required: ['headlineItemId', 'bodyItemId', 'relationship', 'scaleRatio'], additionalProperties: false }
const territoryPaletteProperties = { type: 'object', properties: { hex: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }, name: { type: 'string', minLength: 1, maxLength: 80 }, role: { type: 'string', enum: ['ground', 'accent', 'support', 'type'] } }, required: ['hex', 'name', 'role'], additionalProperties: false }
const territoryRelationshipProperties = { type: 'object', properties: { fromItemId: { type: 'string', minLength: 1, maxLength: 80 }, toItemId: { type: 'string', minLength: 1, maxLength: 80 }, kind: { type: 'string', enum: ['contrast', 'echo', 'sequence', 'material-bridge'] }, rationale: { type: 'string', minLength: 1, maxLength: 240 } }, required: ['fromItemId', 'toItemId', 'kind', 'rationale'], additionalProperties: false }
const territoryApplicationProperties = { type: 'object', properties: { itemId: { type: 'string', minLength: 1, maxLength: 80 }, format: { type: 'string', minLength: 1, maxLength: 80 }, caption: { type: 'string', minLength: 1, maxLength: 240 } }, required: ['itemId', 'format', 'caption'], additionalProperties: false }
const creativeTerritoryProperties = { type: 'object', properties: { id: { type: 'string', minLength: 1, maxLength: 80 }, title: { type: 'string', minLength: 1, maxLength: 120 }, routeId: { type: 'string', minLength: 1, maxLength: 80 }, thesis: { type: 'string', minLength: 1, maxLength: 400 }, mood: { type: 'string', minLength: 1, maxLength: 180 }, density: { type: 'string', enum: ['restrained', 'balanced', 'dense'] }, groupingSignals: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 80 }, minItems: 1, maxItems: 8 }, references: { type: 'array', items: territoryReferenceProperties, minItems: 2, maxItems: 3 }, hierarchy: territoryHierarchyProperties, typography: territoryTypographyProperties, palette: { type: 'array', items: territoryPaletteProperties, minItems: 3, maxItems: 5 }, relationships: { type: 'array', items: territoryRelationshipProperties, minItems: 1, maxItems: 6 }, application: territoryApplicationProperties }, required: ['id', 'title', 'routeId', 'thesis', 'mood', 'density', 'groupingSignals', 'references', 'hierarchy', 'typography', 'palette', 'relationships', 'application'], additionalProperties: false }
const mutationProperties = { campaignId: { type: 'string' }, boardId: { type: 'string' }, expectedBoardVersion: { type: 'integer', minimum: 0 }, idempotencyKey: { type: 'string', minLength: 1 } }
const harmonyModes = ['monochrome', 'monochrome-dark', 'monochrome-light', 'analogic', 'complement', 'analogic-complement', 'triad', 'quad'] as const
const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9A-F]{6}$/i.test(value)
const isTagList = (value: unknown): value is string[] => Array.isArray(value) && value.length >= 1 && value.length <= 8 && value.every((tag) => typeof tag === 'string' && tag.trim().length >= 1 && tag.trim().length <= 32)
const validContext = (state: WorkspaceState, input: unknown) => isObject(input) && hasExactKeys(input, ['campaignId', 'boardId']) && input.campaignId === state.campaign.id && input.boardId === state.campaign.boardId

function parsedStringList(value: unknown, maximum: number): string[] | null {
  return Array.isArray(value) && value.length >= 1 && value.length <= maximum && value.every((item) => typeof item === 'string' && item.trim().length >= 1 && item.trim().length <= 120) ? value.map((item) => item.trim()) : null
}

function parsedCampaignBrief(value: unknown): CampaignBrief | null {
  if (!isObject(value) || !hasExactKeys(value, ['objective', 'audience', 'proposition', 'tone', 'mandatoryAssets', 'antiDirections', 'schedule']) || typeof value.objective !== 'string' || !value.objective.trim() || value.objective.length > 500 || typeof value.audience !== 'string' || !value.audience.trim() || value.audience.length > 500 || typeof value.proposition !== 'string' || !value.proposition.trim() || value.proposition.length > 500 || typeof value.schedule !== 'string' || !value.schedule.trim() || value.schedule.length > 160) return null
  const tone = parsedStringList(value.tone, 8); const mandatoryAssets = parsedStringList(value.mandatoryAssets, 12); const antiDirections = parsedStringList(value.antiDirections, 12)
  return tone && mandatoryAssets && antiDirections ? { objective: value.objective.trim(), audience: value.audience.trim(), proposition: value.proposition.trim(), tone, mandatoryAssets, antiDirections, schedule: value.schedule.trim() } : null
}

function parsedCreativeRoute(value: unknown): Omit<CreativeRoute, 'status'> | null {
  if (!isObject(value) || !hasExactKeys(value, ['id', 'name', 'thesis', 'territory', 'palette', 'typography', 'imageTreatment', 'compositionPrinciples', 'frame']) || typeof value.id !== 'string' || !value.id.trim() || value.id.length > 80 || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120 || typeof value.thesis !== 'string' || !value.thesis.trim() || value.thesis.length > 320 || typeof value.territory !== 'string' || !value.territory.trim() || value.territory.length > 80 || !Array.isArray(value.palette) || value.palette.length < 2 || value.palette.length > 6 || !value.palette.every(isHex) || typeof value.typography !== 'string' || !value.typography.trim() || value.typography.length > 320 || typeof value.imageTreatment !== 'string' || !value.imageTreatment.trim() || value.imageTreatment.length > 320 || !isObject(value.frame) || !hasExactKeys(value.frame, ['position', 'width', 'height']) || !finitePoint(value.frame.position) || typeof value.frame.width !== 'number' || !Number.isFinite(value.frame.width) || typeof value.frame.height !== 'number' || !Number.isFinite(value.frame.height)) return null
  const compositionPrinciples = parsedStringList(value.compositionPrinciples, 6)
  return compositionPrinciples ? { id: value.id.trim(), name: value.name.trim(), thesis: value.thesis.trim(), territory: value.territory.trim(), palette: value.palette as string[], typography: value.typography.trim(), imageTreatment: value.imageTreatment.trim(), compositionPrinciples, frame: { position: value.frame.position, width: value.frame.width, height: value.frame.height } } : null
}

function parsedOrganizationScope(value: unknown): BoardOrganizationScope | null {
  if (!isObject(value) || typeof value.type !== 'string') return null
  if (value.type === 'route' && hasExactKeys(value, ['type', 'routeId']) && typeof value.routeId === 'string' && value.routeId.trim() && value.routeId.length <= 80) return { type: 'route', routeId: value.routeId.trim() }
  if (value.type === 'territory' && hasExactKeys(value, ['type', 'territory']) && typeof value.territory === 'string' && value.territory.trim() && value.territory.length <= 80) return { type: 'territory', territory: value.territory.trim() }
  if (value.type === 'selection' && hasExactKeys(value, ['type', 'itemIds']) && Array.isArray(value.itemIds) && value.itemIds.length >= 1 && value.itemIds.length <= 200 && value.itemIds.every((id) => typeof id === 'string' && id.length >= 1 && id.length <= 80) && new Set(value.itemIds).size === value.itemIds.length) return { type: 'selection', itemIds: value.itemIds as string[] }
  if (value.type === 'whole-board' && hasExactKeys(value, ['type'])) return { type: 'whole-board' }
  return null
}

function parsedBoardOrganization(value: unknown): BoardOrganizationRequest | null {
  if (!isObject(value) || !hasExactKeys(value, ['id', 'title', 'scope', 'strategy', 'layout', 'maximumGroups', 'ranking', 'briefKeywords']) || typeof value.id !== 'string' || !value.id.trim() || value.id.length > 80 || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 120 || !['tag', 'type'].includes(String(value.strategy)) || value.layout !== 'cluster-grid' || !Number.isInteger(value.maximumGroups) || Number(value.maximumGroups) < 1 || Number(value.maximumGroups) > 6 || !['visual-weight', 'board-order'].includes(String(value.ranking)) || (value.briefKeywords !== undefined && (!Array.isArray(value.briefKeywords) || value.briefKeywords.length > 8 || !value.briefKeywords.every((keyword) => typeof keyword === 'string' && keyword.trim().length >= 1 && keyword.length <= 80)))) return null
  const scope = parsedOrganizationScope(value.scope)
  if (!scope) return null
  return { id: value.id.trim(), title: value.title.trim(), scope, strategy: value.strategy as BoardOrganizationRequest['strategy'], layout: 'cluster-grid', maximumGroups: Number(value.maximumGroups), ranking: value.ranking as BoardOrganizationRequest['ranking'], ...(Array.isArray(value.briefKeywords) ? { briefKeywords: value.briefKeywords.map((keyword) => String(keyword).trim()) } : {}) }
}

function parsedCreativeTerritory(value: unknown): CreativeTerritoryRequest | null {
  const keys = ['id', 'title', 'routeId', 'thesis', 'mood', 'density', 'groupingSignals', 'references', 'hierarchy', 'typography', 'palette', 'relationships', 'application']
  if (!isObject(value) || !hasExactKeys(value, keys) || !Array.isArray(value.groupingSignals) || !Array.isArray(value.references) || !Array.isArray(value.palette) || !Array.isArray(value.relationships) || !isObject(value.hierarchy) || !isObject(value.typography) || !isObject(value.application)) return null
  if (!hasExactKeys(value.hierarchy, ['heroItemId', 'primaryItemIds', 'supportingItemIds']) || !hasExactKeys(value.typography, ['headlineItemId', 'bodyItemId', 'relationship', 'scaleRatio']) || !hasExactKeys(value.application, ['itemId', 'format', 'caption'])) return null
  if (value.references.some((entry) => !isObject(entry) || !hasExactKeys(entry, ['itemId', 'contribution', 'annotation'])) || value.palette.some((entry) => !isObject(entry) || !hasExactKeys(entry, ['hex', 'name', 'role'])) || value.relationships.some((entry) => !isObject(entry) || !hasExactKeys(entry, ['fromItemId', 'toItemId', 'kind', 'rationale']))) return null
  return value as unknown as CreativeTerritoryRequest
}

async function responseJson(response: Response) {
  const payload = await response.json().catch(() => null) as { error?: string } | null
  if (!response.ok) throw new Error(payload?.error ?? 'The provider is unavailable.')
  return payload
}

function viewportPayload(state: WorkspaceState, controller: BoardViewportController) {
  const viewport = controller.getViewport()
  const size = controller.getViewportSize()
  const bounds = boundsForItems(state.boardItems, true)
  const visibleBounds = visibleWorldBounds(viewport, size)
  const visibleItems = state.boardItems.filter((item) => itemIntersectsBounds(item, visibleBounds)).map((item) => ({ id: item.id, title: item.title, kind: item.kind, territory: item.territory }))
  return { zoom: viewport.scale, center: viewportCenter(viewport, size), bounds, visibleBounds, visibleItems }
}

function viewportAvailable(controller: BoardViewportController | undefined): controller is BoardViewportController {
  if (!controller) return false
  const size = controller.getViewportSize()
  return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0
}

export async function registerIterumTools(runtime: WorkspaceRuntime, controller = new AbortController(), viewportController?: BoardViewportController, reviewUi?: ReviewUiController, presentationUi?: PresentationUiController, projectController?: ProjectController): Promise<RegisteredTools | null> {
  if (!document.modelContext) return null
  const tools: WebMCPTool[] = [
    {
      name: 'get_campaign_context', title: 'Read campaign context', description: 'Read the current Iterum campaign, board version, proposal queue, placement policy, and recent receipts without making changes.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); if (!validContext(state, input)) return invalid(state, 'campaignId and boardId are the only accepted fields for the open campaign.'); return success(state, { campaign: state.campaign, creativeRoutes: state.creativeRoutes, placementPolicy: state.placementPolicy, colorPalette: state.colorPalette, typeDirection: state.typeDirection, typeProposals: state.typeProposals, layoutProposals: state.layoutProposals, proposals: state.proposals, receipts: state.receipts.slice(0, 8), persistence: projectController ? projectController.getStatus() : null, imageGeneration: projectController?.imageGeneration ? { model: 'gpt-image-2', tools: ['generate_image_candidates', 'edit_image_candidate', 'generate_campaign_applications', 'get_image_generation_run'], approvalBoundary: 'Every generated output enters Review before it can become board content.' } : null, productBoundary: projectController ? 'Convex cloud persistence, autosave, immutable snapshots, recovery, and review-first image generation are active. Presentation export remains future work.' : 'This fixture is intentionally session-only. Open a cloud project for persistence and recovery.' }, `Read ${state.campaign.name} at board version ${state.version}.`) },
    },
    {
      name: 'update_campaign_brief', title: 'Structure the campaign brief', description: 'Update the current draft brief with explicit objective, audience, proposition, tone, mandatories, anti-directions, and schedule. A locked brief cannot be changed.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, name: { type: 'string', minLength: 1, maxLength: 120 }, line: { type: 'string', minLength: 1, maxLength: 180 }, brief: briefProperties }, required: [...requiredMutation, 'name', 'line', 'brief'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (!hasExactKeys(checked.value, [...requiredMutation, 'name', 'line', 'brief']) || typeof checked.value.name !== 'string' || typeof checked.value.line !== 'string') return invalid(state, 'Provide only the campaign name, line, and structured brief.'); const brief = parsedCampaignBrief(checked.value.brief); if (!brief) return invalid(state, 'The structured brief is incomplete or exceeds its field limits.'); return execute(runtime, { type: 'update-campaign-brief', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', name: checked.value.name, line: checked.value.line, brief }) },
    },
    {
      name: 'request_campaign_brief_lock', title: 'Request brief approval', description: 'Openly report that only the designer can lock the campaign brief before route exploration. This tool does not lock it.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); if (!validContext(state, input)) return invalid(state, 'campaignId and boardId are the only accepted fields for the open campaign.'); return success(state, { briefStatus: state.campaign.briefStatus, requiresDesignerApproval: state.campaign.briefStatus !== 'locked' }, state.campaign.briefStatus === 'locked' ? 'The designer has locked the campaign brief.' : 'The campaign brief is ready for designer review and lock.') },
    },
    {
      name: 'propose_creative_routes', title: 'Propose creative routes', description: 'Propose one to three distinct, bounded creative routes against the locked brief. Routes appear as reviewable frames; the agent cannot approve them.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, routes: { type: 'array', items: creativeRouteProperties, minItems: 1, maxItems: 3 } }, required: [...requiredMutation, 'routes'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (!hasExactKeys(checked.value, [...requiredMutation, 'routes']) || !Array.isArray(checked.value.routes)) return invalid(state, 'routes is the only additional field and must contain one to three directions.'); const routes = checked.value.routes.map(parsedCreativeRoute); if (routes.length < 1 || routes.length > 3 || routes.some((route) => !route)) return invalid(state, 'Each route needs a distinct idea, palette, typography, image treatment, composition principles, and bounded frame.'); return execute(runtime, { type: 'propose-creative-routes', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', routes: routes as Array<Omit<CreativeRoute, 'status'>> }) },
    },
    {
      name: 'request_creative_route_decision', title: 'Request route decision', description: 'Return one pending creative route for designer approval or rejection without making the decision.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, routeId: { type: 'string', minLength: 1 } }, required: ['campaignId', 'boardId', 'routeId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'routeId']) || input.campaignId !== state.campaign.id || input.boardId !== state.campaign.boardId || typeof input.routeId !== 'string') return invalid(state, 'Provide the open campaign and one routeId.'); const route = state.creativeRoutes.find((candidate) => candidate.id === input.routeId); if (!route) return failure(state, 'CREATIVE_ROUTE_NOT_FOUND', 'The creative route no longer exists.'); return success(state, { route, requiresDesignerApproval: route.status === 'pending' }, route.status === 'pending' ? `Creative route “${route.name}” is awaiting designer review.` : `Creative route “${route.name}” is ${route.status}.`) },
    },
    {
      name: 'get_board_display_mode', title: 'Read the board display mode', description: 'Read whether the local Iterum workspace is in explanatory Working mode or client-facing Present mode, including open drawers and transient selection state. This never changes canonical board data.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!validContext(state, input)) return invalid(state, 'campaignId and boardId are the only accepted fields for the open campaign.')
        if (!presentationUi) return failure(state, 'PRESENTATION_UI_UNAVAILABLE', 'The board display controls are not mounted yet.', true)
        const display = presentationUi.getDisplayState()
        return success(state, { ...display, canonicalStateChanged: false }, `The board is in ${display.mode === 'working' ? 'Working' : 'Present'} mode.`)
      },
    },
    {
      name: 'set_board_display_mode', title: 'Set the board display mode', description: 'Switch the local Iterum workspace between explanatory Working mode and client-facing Present mode. This changes only transient presentation state and never changes board content, approvals, versions, or receipts.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, mode: { type: 'string', enum: ['working', 'presentation'] } }, required: ['campaignId', 'boardId', 'mode'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'mode']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || !['working', 'presentation'].includes(String(input.mode))) return invalid(state, 'Provide the open campaign and mode working or presentation.')
        if (!presentationUi) return failure(state, 'PRESENTATION_UI_UNAVAILABLE', 'The board display controls are not mounted yet.', true)
        presentationUi.setDisplayMode(input.mode as BoardDisplayMode)
        return success(state, { ...presentationUi.getDisplayState(), canonicalStateChanged: false }, `Switched the board to ${input.mode === 'working' ? 'Working' : 'Present'} mode.`, undefined, true)
      },
    },
    {
      name: 'prepare_direction_presentation', title: 'Prepare an approved direction for presentation', description: 'Prepare one explicitly approved creative route for client review: close drawers, clear selections and previews, return to the Mechanical surface, fit that territory, and enter Present mode. This changes only transient presentation state.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, routeId: { type: 'string', minLength: 1, maxLength: 80 } }, required: ['campaignId', 'boardId', 'routeId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'routeId']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || typeof input.routeId !== 'string' || !input.routeId.trim() || input.routeId.length > 80) return invalid(state, 'Provide the open campaign and one explicit approved routeId.')
        if (!presentationUi) return failure(state, 'PRESENTATION_UI_UNAVAILABLE', 'The board display controls are not mounted yet.', true)
        if (!viewportAvailable(viewportController)) return failure(state, 'VIEWPORT_UNAVAILABLE', 'The board viewport is not mounted yet.', true)
        const route = state.creativeRoutes.find((candidate) => candidate.id === input.routeId)
        if (!route) return failure(state, 'CREATIVE_ROUTE_NOT_FOUND', 'The creative route no longer exists.')
        if (route.status !== 'approved') return failure(state, 'CREATIVE_ROUTE_NOT_APPROVED', `Creative route “${route.name}” must be approved by the designer before presentation.`)
        const territory = route.territory.trim().toLocaleLowerCase()
        const items = state.boardItems.filter((item) => item.territory.trim().toLocaleLowerCase() === territory)
        if (items.length === 0) return failure(state, 'APPROVED_TERRITORY_EMPTY', `Approved route “${route.name}” has no board items to present.`)
        presentationUi.preparePresentation()
        viewportController.setViewport(fitBounds(boundsForItems(items, true), viewportController.getViewportSize()), 'fit')
        const itemsByKind = items.reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.kind]: (counts[item.kind] ?? 0) + 1 }), {})
        return success(state, {
          route: { id: route.id, name: route.name, territory: route.territory, thesis: route.thesis, status: route.status },
          presentation: { ...presentationUi.getDisplayState(), canonicalStateChanged: false },
          includedItems: items.map((item) => ({ id: item.id, title: item.title, kind: item.kind, hierarchyRole: item.hierarchyRole })),
          itemsByKind,
          heroItems: items.filter((item) => item.hierarchyRole === 'hero').map((item) => ({ id: item.id, title: item.title })),
          palette: state.colorPalette.pinned,
          typography: state.typeDirection ? { headline: state.typeDirection.headline.family, body: state.typeDirection.body.family, specimenText: state.typeDirection.specimenText } : null,
          viewport: viewportPayload(state, viewportController),
        }, `Prepared approved direction “${route.name}” in Present mode with ${items.length} items.`, undefined, true)
      },
    },
    {
      name: 'get_board_viewport', title: 'Read the board viewport', description: 'Read the current presentation-only board zoom, center, mechanical bounds, visible world bounds, and visible items without changing the canonical board.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!validContext(state, input)) return invalid(state, 'campaignId and boardId are the only accepted fields for the open campaign.')
        if (!viewportAvailable(viewportController)) return failure(state, 'VIEWPORT_UNAVAILABLE', 'The board viewport is not mounted yet.', true)
        return success(state, viewportPayload(state, viewportController), `Read the board viewport at ${Math.round(viewportController.getViewport().scale * 100)}%.`)
      },
    },
    {
      name: 'focus_board_items', title: 'Focus board items', description: 'Frame one or more current board items, or every item in a named territory. This changes only the local presentation viewport.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, itemIds: { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 1, maxItems: 24 }, territory: { type: 'string', minLength: 1, maxLength: 80 } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'itemIds', 'territory']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || (input.itemIds !== undefined && (!Array.isArray(input.itemIds) || input.itemIds.length < 1 || input.itemIds.length > 24 || !input.itemIds.every((id) => typeof id === 'string' && id.length > 0))) || (input.territory !== undefined && (typeof input.territory !== 'string' || !input.territory.trim() || input.territory.length > 80)) || (input.itemIds === undefined && input.territory === undefined)) return invalid(state, 'Provide the open campaign and at least one board item ID or one territory.')
        if (!viewportAvailable(viewportController)) return failure(state, 'VIEWPORT_UNAVAILABLE', 'The board viewport is not mounted yet.', true)
        const ids = new Set(Array.isArray(input.itemIds) ? input.itemIds.map(String) : [])
        const territory = typeof input.territory === 'string' ? input.territory.trim().toLocaleLowerCase() : ''
        const targets = state.boardItems.filter((item) => ids.has(item.id) || Boolean(territory && item.territory.toLocaleLowerCase() === territory))
        if (targets.length === 0) return failure(state, 'BOARD_ITEM_NOT_FOUND', 'No current board items match that focus request.')
        viewportController.setViewport(fitBounds(boundsForItems(targets), viewportController.getViewportSize(), 64), 'custom')
        return success(state, { focusedItems: targets.map((item) => ({ id: item.id, title: item.title, territory: item.territory })), viewport: viewportPayload(state, viewportController) }, `Framed ${targets.length} board item${targets.length === 1 ? '' : 's'}.`, undefined, true)
      },
    },
    {
      name: 'set_board_viewport', title: 'Set the board viewport', description: 'Set a bounded local board zoom and world-space center. This does not change board content, version, or action receipts.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, zoom: { type: 'number', minimum: .25, maximum: 3 }, center: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'], additionalProperties: false } }, required: ['campaignId', 'boardId', 'zoom', 'center'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'zoom', 'center']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || typeof input.zoom !== 'number' || !Number.isFinite(input.zoom) || input.zoom < .25 || input.zoom > 3 || !finitePoint(input.center)) return invalid(state, 'Provide the open campaign, a zoom from 0.25–3, and a finite world-space center.')
        if (!viewportAvailable(viewportController)) return failure(state, 'VIEWPORT_UNAVAILABLE', 'The board viewport is not mounted yet.', true)
        const bounds = boundsForItems(state.boardItems, true)
        const center = { x: Math.min(bounds.x + bounds.width, Math.max(bounds.x, input.center.x)), y: Math.min(bounds.y + bounds.height, Math.max(bounds.y, input.center.y)) }
        viewportController.setViewport(viewportFromCenter(center, input.zoom, viewportController.getViewportSize()), 'custom')
        return success(state, viewportPayload(state, viewportController), `Set the board viewport to ${Math.round(input.zoom * 100)}%.`, undefined, true)
      },
    },
    {
      name: 'reset_board_viewport', title: 'Fit the board', description: 'Return the local presentation viewport to Fit Board without changing canonical board data.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!validContext(state, input)) return invalid(state, 'campaignId and boardId are the only accepted fields for the open campaign.')
        if (!viewportAvailable(viewportController)) return failure(state, 'VIEWPORT_UNAVAILABLE', 'The board viewport is not mounted yet.', true)
        viewportController.setViewport(fitBounds(boundsForItems(state.boardItems, true), viewportController.getViewportSize()), 'fit')
        return success(state, viewportPayload(state, viewportController), 'Fit the full board in the current viewport.', undefined, true)
      },
    },
    {
      name: 'get_board_items', title: 'Read board items', description: 'Read every current board item with kind, geometry, territory, group, lock state, and note content. Also lists pending Direction Drafts.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!validContext(state, input)) return invalid(state, 'campaignId and boardId are the only accepted fields for the open campaign.')
        return success(state, { items: state.boardItems.map((item) => ({ id: item.id, title: item.title, kind: item.kind, territory: item.territory, groupId: item.groupId, groupLabel: item.groupLabel, hierarchyRole: item.hierarchyRole, hierarchyConfidence: item.hierarchyConfidence, locked: item.locked, position: item.position, width: item.width, height: item.height, noteBody: item.noteBody, noteTone: item.noteTone })), pendingDirectionDrafts: state.layoutProposals.filter((proposal) => proposal.status === 'pending').map((proposal) => ({ id: proposal.id, title: proposal.title, changes: proposal.changes.length + proposal.notes.length, isOrganizationProposal: Boolean(proposal.organization) })) }, `Read ${state.boardItems.length} board items.`)
      },
    },
    {
      name: 'get_board_structure', title: 'Read board structure', description: 'Read creative routes, approved groups and hierarchy roles, unresolved organization items, and stored organization proposals without changing the board.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!validContext(state, input)) return invalid(state, 'campaignId and boardId are the only accepted fields for the open campaign.')
        const groupIds = [...new Set(state.boardItems.map((item) => item.groupId).filter(Boolean) as string[])]
        const organizationProposals = state.layoutProposals.flatMap((proposal) => proposal.organization ? [{ proposalId: proposal.id, title: proposal.title, status: proposal.status, ...proposal.organization }] : [])
        return success(state, {
          routes: state.creativeRoutes.map((route) => ({ id: route.id, name: route.name, territory: route.territory, status: route.status, frame: route.frame })),
          groups: groupIds.map((groupId) => ({ id: groupId, label: state.boardItems.find((item) => item.groupId === groupId)?.groupLabel ?? groupId, items: state.boardItems.filter((item) => item.groupId === groupId).map((item) => ({ id: item.id, title: item.title, role: item.hierarchyRole, confidence: item.hierarchyConfidence })) })),
          ungroupedItems: state.boardItems.filter((item) => !item.groupId).map((item) => ({ id: item.id, title: item.title, territory: item.territory, locked: item.locked })),
          unresolvedItems: organizationProposals.filter((proposal) => proposal.status === 'pending').flatMap((proposal) => proposal.unresolvedItems.map((entry) => ({ proposalId: proposal.proposalId, ...entry }))),
          organizationProposals,
        }, `Read ${groupIds.length} approved groups and ${organizationProposals.length} organization proposals.`)
      },
    },
    {
      name: 'propose_board_organization', title: 'Propose board organization', description: 'Create an immutable, deterministic organization proposal for one explicit route, territory, selection, or whole-board scope. It never changes the live board and cannot approve its own proposal.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, organization: organizationProperties }, required: [...requiredMutation, 'organization'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot(); const checked = mutationInput(state, input)
        if ('response' in checked) return checked.response
        if (!hasExactKeys(checked.value, [...requiredMutation, 'organization'])) return invalid(state, 'organization is the only additional accepted field.')
        const request = parsedBoardOrganization(checked.value.organization)
        if (!request) return invalid(state, 'Provide a strict organization request with an explicit scope, tag or type grouping, cluster-grid layout, group limit, and ranking method.')
        const result = runtime.dispatch({ type: 'propose-board-organization', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', request })
        if (!result.ok) return failure(result.state, result.error.code, result.error.message, result.error.code === 'VERSION_CONFLICT')
        const proposal = result.state.layoutProposals.find((candidate) => candidate.id === request.id)
        return success(result.state, { proposalId: request.id, baselineBoardVersion: proposal?.organization?.baselineBoardVersion, groups: proposal?.organization?.groups ?? [], unresolvedItems: proposal?.organization?.unresolvedItems ?? [], untouchedLockedItemIds: proposal?.organization?.untouchedLockedItemIds ?? [], requiresDesignerApproval: true }, result.receipt.summary, result.receipt)
      },
    },
    {
      name: 'propose_creative_territory', title: 'Compose a creative territory', description: 'Turn one route into a reviewable art-direction system: thesis, mood, reference contributions, explicit hierarchy, type relationship, role-based palette, reference relationships, and one campaign application. It opens a collision-safe preview but cannot approve it.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, territory: creativeTerritoryProperties }, required: [...requiredMutation, 'territory'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot(); const checked = mutationInput(state, input)
        if ('response' in checked) return checked.response
        if (!hasExactKeys(checked.value, [...requiredMutation, 'territory'])) return invalid(state, 'territory is the only additional accepted field.')
        const request = parsedCreativeTerritory(checked.value.territory)
        if (!request) return invalid(state, 'Provide one strict creative territory with thesis, mood, references, hierarchy, typography, palette, relationships, and an application.')
        const generated = createCreativeTerritoryProposal(state, request)
        if (!generated.ok) return failure(state, generated.code, generated.message)
        const result = runtime.dispatch({ type: 'propose-board-layout', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposal: generated.proposal })
        if (!result.ok) return failure(result.state, result.error.code, result.error.message, result.error.code === 'VERSION_CONFLICT')
        const proposal = result.state.layoutProposals.find((candidate) => candidate.id === request.id)!
        const changedIds = new Set(proposal.changes.map((change) => change.itemId))
        const projectedItems = projectBoardLayout(result.state.boardItems, proposal).filter((item) => changedIds.has(item.id))
        reviewUi?.previewLayoutProposal(proposal.id); reviewUi?.openReview()
        if (viewportAvailable(viewportController) && projectedItems.length) viewportController.setViewport(fitBounds(boundsForItems(projectedItems), viewportController.getViewportSize(), 64), 'custom')
        return success(result.state, { proposalId: proposal.id, creativeTerritory: proposal.creativeTerritory, projectedItems: projectedItems.map((item) => ({ id: item.id, position: item.position, width: item.width, height: item.height, hierarchyRole: item.hierarchyRole })), requiresDesignerApproval: true }, result.receipt.summary, result.receipt, Boolean(reviewUi || viewportController))
      },
    },
    {
      name: 'preview_board_organization', title: 'Preview board organization', description: 'Open one pending organization proposal as a ghost arrangement, focus its affected region, and place it at the designer review boundary without changing canonical board data.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, proposalId: { type: 'string', minLength: 1, maxLength: 80 } }, required: ['campaignId', 'boardId', 'proposalId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'proposalId']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || typeof input.proposalId !== 'string' || !input.proposalId) return invalid(state, 'Provide the open campaign and one organization proposal ID.')
        const proposal = state.layoutProposals.find((candidate) => candidate.id === input.proposalId && candidate.organization)
        if (!proposal?.organization) return failure(state, 'BOARD_LAYOUT_NOT_FOUND', 'The organization proposal no longer exists.')
        if (proposal.status !== 'pending') return failure(state, 'BOARD_LAYOUT_NOT_PENDING', 'Only pending organization proposals can be previewed.')
        if (state.version !== proposal.organization.baselineBoardVersion + 1) return failure(state, 'STALE_BOARD_ORGANIZATION', 'The board changed after this organization proposal was created. Generate a fresh preview.')
        const ids = new Set(proposal.changes.map((change) => change.itemId))
        const projectedItems = projectBoardLayout(state.boardItems, proposal).filter((item) => ids.has(item.id))
        reviewUi?.previewLayoutProposal(proposal.id); reviewUi?.openReview()
        if (viewportAvailable(viewportController) && projectedItems.length) viewportController.setViewport(fitBounds(boundsForItems(projectedItems), viewportController.getViewportSize(), 64), 'custom')
        return success(state, { proposalId: proposal.id, groups: proposal.organization.groups, assignments: proposal.organization.assignments, unresolvedItems: proposal.organization.unresolvedItems, untouchedLockedItemIds: proposal.organization.untouchedLockedItemIds, projectedItems: projectedItems.map((item) => ({ id: item.id, position: item.position, width: item.width, height: item.height, groupId: item.groupId, hierarchyRole: item.hierarchyRole })) }, `Previewing organization proposal “${proposal.title}”.`, undefined, Boolean(reviewUi || viewportController))
      },
    },
    {
      name: 'explain_board_group', title: 'Explain a board group', description: 'Explain why one proposed or approved group exists, which reference is the hero, hierarchy roles, confidence, and weak matches without changing the board.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, groupId: { type: 'string', minLength: 1, maxLength: 120 }, proposalId: { type: 'string', minLength: 1, maxLength: 80 } }, required: ['campaignId', 'boardId', 'groupId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'groupId', 'proposalId']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || typeof input.groupId !== 'string' || !input.groupId || (input.proposalId !== undefined && (typeof input.proposalId !== 'string' || !input.proposalId))) return invalid(state, 'Provide the open campaign, a group ID, and optionally its organization proposal ID.')
        const proposal = typeof input.proposalId === 'string' ? state.layoutProposals.find((candidate) => candidate.id === input.proposalId && candidate.organization) : state.layoutProposals.find((candidate) => candidate.organization?.groups.some((group) => group.id === input.groupId))
        const proposedGroup = proposal?.organization?.groups.find((group) => group.id === input.groupId)
        if (proposedGroup && proposal?.organization) return success(state, { state: proposal.status, proposalId: proposal.id, group: proposedGroup, assignments: proposal.organization.assignments.filter((assignment) => assignment.groupId === proposedGroup.id).map((assignment) => ({ ...assignment, itemTitle: state.boardItems.find((item) => item.id === assignment.itemId)?.title ?? assignment.itemId })), weakMatches: proposal.organization.unresolvedItems }, `Explained proposed group “${proposedGroup.label}”.`)
        const approvedItems = state.boardItems.filter((item) => item.groupId === input.groupId)
        if (!approvedItems.length) return failure(state, 'BOARD_ITEM_NOT_FOUND', 'No proposed or approved board group matches that ID.')
        return success(state, { state: 'approved', group: { id: input.groupId, label: approvedItems[0].groupLabel ?? input.groupId }, assignments: approvedItems.map((item) => ({ itemId: item.id, itemTitle: item.title, role: item.hierarchyRole, confidence: item.hierarchyConfidence })) }, `Explained approved group “${approvedItems[0].groupLabel ?? input.groupId}”.`)
      },
    },
    {
      name: 'add_board_note', title: 'Propose a board note', description: 'Add one sourced-free art-direction note to a pending Direction Draft for designer preview and approval. This never places the note directly.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, draftId: { type: 'string', minLength: 1, maxLength: 80 }, rationale: { type: 'string', minLength: 1, maxLength: 320 }, note: boardNoteProperties }, required: [...requiredMutation, 'draftId', 'rationale', 'note'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot(); const checked = mutationInput(state, input)
        if ('response' in checked) return checked.response
        if (!hasExactKeys(checked.value, [...requiredMutation, 'draftId', 'rationale', 'note']) || typeof checked.value.draftId !== 'string' || !checked.value.draftId || typeof checked.value.rationale !== 'string' || !checked.value.rationale.trim()) return invalid(state, 'Provide a unique draft ID, rationale, and strict board note.')
        const note = parsedBoardNote(checked.value.note)
        if (!note) return invalid(state, 'The note needs short copy, tone, territory, and bounded geometry.')
        return execute(runtime, { type: 'propose-board-layout', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposal: { id: checked.value.draftId, title: `Note: ${note.title}`, rationale: checked.value.rationale, changes: [], notes: [note] } })
      },
    },
    {
      name: 'propose_board_layout', title: 'Propose a Direction Draft', description: 'Create one reviewable batch of board moves, resizes, lock changes, territory/group assignments, and new notes. Unlocking a protected item remains a designer-reviewed decision.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, layout: boardLayoutProperties }, required: [...requiredMutation, 'layout'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot(); const checked = mutationInput(state, input)
        if ('response' in checked) return checked.response
        if (!hasExactKeys(checked.value, [...requiredMutation, 'layout'])) return invalid(state, 'layout is the only additional accepted field.')
        const layout = parsedBoardLayout(checked.value.layout)
        if (!layout) return invalid(state, 'Provide a strict Direction Draft with at least one bounded change or note.')
        return execute(runtime, { type: 'propose-board-layout', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposal: layout })
      },
    },
    {
      name: 'preview_board_layout', title: 'Preview a Direction Draft', description: 'Project a pending Direction Draft and show its ghost layout on the board without changing canonical board data.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, proposalId: { type: 'string', minLength: 1 } }, required: ['campaignId', 'boardId', 'proposalId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'proposalId']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || typeof input.proposalId !== 'string' || !input.proposalId) return invalid(state, 'Provide the open campaign and a pending Direction Draft ID.')
        const proposal = state.layoutProposals.find((item) => item.id === input.proposalId)
        if (!proposal) return failure(state, 'BOARD_LAYOUT_NOT_FOUND', 'The Direction Draft no longer exists.')
        if (proposal.status !== 'pending') return failure(state, 'BOARD_LAYOUT_NOT_PENDING', 'Only pending Direction Drafts can be previewed.')
        const changedIds = new Set([...proposal.changes.map((change) => change.itemId), ...proposal.notes.map((note) => note.id)])
        const projected = projectBoardLayout(state.boardItems, proposal).filter((item) => changedIds.has(item.id)).map((item) => ({ id: item.id, title: item.title, kind: item.kind, territory: item.territory, groupId: item.groupId, position: item.position, width: item.width, height: item.height }))
        reviewUi?.previewLayoutProposal(proposal.id); reviewUi?.openReview()
        return success(state, { proposal: { id: proposal.id, title: proposal.title, rationale: proposal.rationale }, projectedItems: projected }, `Previewing Direction Draft “${proposal.title}”.`, undefined, Boolean(reviewUi))
      },
    },
    {
      name: 'apply_board_layout', title: 'Request Direction Draft application', description: 'Open a pending Direction Draft at its designer approval boundary. The agent cannot apply the canonical batch itself.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, proposalId: { type: 'string', minLength: 1 } }, required: ['campaignId', 'boardId', 'proposalId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'proposalId']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || typeof input.proposalId !== 'string' || !input.proposalId) return invalid(state, 'Provide the open campaign and a pending Direction Draft ID.')
        const proposal = state.layoutProposals.find((item) => item.id === input.proposalId)
        if (!proposal) return failure(state, 'BOARD_LAYOUT_NOT_FOUND', 'The Direction Draft no longer exists.')
        if (proposal.status !== 'pending') return failure(state, 'BOARD_LAYOUT_NOT_PENDING', 'Only pending Direction Drafts can be applied.')
        reviewUi?.previewLayoutProposal(proposal.id); reviewUi?.openReview()
        return success(state, { proposalId: proposal.id, requiresDesignerApproval: true }, `Direction Draft “${proposal.title}” is ready for designer approval in Review.`, undefined, Boolean(reviewUi))
      },
    },
    {
      name: 'group_board_items', title: 'Propose a board group', description: 'Propose grouping current board items inside a reviewable Direction Draft. Grouping does not move or resize locked references.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, draftId: { type: 'string', minLength: 1, maxLength: 80 }, groupId: { type: 'string', minLength: 1, maxLength: 80 }, groupLabel: { type: 'string', minLength: 1, maxLength: 80 }, itemIds: { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 2, maxItems: 24 }, rationale: { type: 'string', minLength: 1, maxLength: 320 } }, required: [...requiredMutation, 'draftId', 'groupId', 'groupLabel', 'itemIds', 'rationale'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot(); const checked = mutationInput(state, input)
        if ('response' in checked) return checked.response
        if (!hasExactKeys(checked.value, [...requiredMutation, 'draftId', 'groupId', 'groupLabel', 'itemIds', 'rationale']) || typeof checked.value.draftId !== 'string' || !checked.value.draftId || typeof checked.value.groupId !== 'string' || !checked.value.groupId || typeof checked.value.groupLabel !== 'string' || !checked.value.groupLabel.trim() || !Array.isArray(checked.value.itemIds) || checked.value.itemIds.length < 2 || checked.value.itemIds.length > 24 || !checked.value.itemIds.every((id) => typeof id === 'string' && id) || typeof checked.value.rationale !== 'string' || !checked.value.rationale.trim()) return invalid(state, 'Provide a unique draft/group, 2–24 current item IDs, and rationale.')
        const itemIds = [...new Set(checked.value.itemIds as string[])]
        return execute(runtime, { type: 'propose-board-layout', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposal: { id: checked.value.draftId, title: `Group: ${checked.value.groupLabel}`, rationale: checked.value.rationale, changes: itemIds.map((itemId) => ({ itemId, groupId: checked.value.groupId as string, groupLabel: checked.value.groupLabel as string })), notes: [] } })
      },
    },
    {
      name: 'assign_board_territory', title: 'Propose a territory assignment', description: 'Propose assigning current board items to a named territory inside a reviewable Direction Draft.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, draftId: { type: 'string', minLength: 1, maxLength: 80 }, territory: { type: 'string', minLength: 1, maxLength: 80 }, itemIds: { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 1, maxItems: 24 }, rationale: { type: 'string', minLength: 1, maxLength: 320 } }, required: [...requiredMutation, 'draftId', 'territory', 'itemIds', 'rationale'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot(); const checked = mutationInput(state, input)
        if ('response' in checked) return checked.response
        if (!hasExactKeys(checked.value, [...requiredMutation, 'draftId', 'territory', 'itemIds', 'rationale']) || typeof checked.value.draftId !== 'string' || !checked.value.draftId || typeof checked.value.territory !== 'string' || !checked.value.territory.trim() || !Array.isArray(checked.value.itemIds) || checked.value.itemIds.length < 1 || checked.value.itemIds.length > 24 || !checked.value.itemIds.every((id) => typeof id === 'string' && id) || typeof checked.value.rationale !== 'string' || !checked.value.rationale.trim()) return invalid(state, 'Provide a unique draft, territory, 1–24 current item IDs, and rationale.')
        const itemIds = [...new Set(checked.value.itemIds as string[])]
        return execute(runtime, { type: 'propose-board-layout', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposal: { id: checked.value.draftId, title: `Territory: ${checked.value.territory}`, rationale: checked.value.rationale, changes: itemIds.map((itemId) => ({ itemId, territory: checked.value.territory as string })), notes: [] } })
      },
    },
    {
      name: 'search_reference_library', title: 'Search the reference library', description: 'Search current board references and pending proposals by title, source, territory, provider, approved tags, or pending tag suggestions without making changes.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, query: { type: 'string', maxLength: 120 }, tags: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 32 }, maxItems: 8 }, scope: { type: 'string', enum: ['all', 'on-board', 'in-review'] } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'query', 'tags', 'scope']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || (input.query !== undefined && (typeof input.query !== 'string' || input.query.length > 120)) || (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.length > 8 || !input.tags.every((tag) => typeof tag === 'string' && tag.trim().length >= 1 && tag.length <= 32))) || (input.scope !== undefined && !['all', 'on-board', 'in-review'].includes(String(input.scope)))) return invalid(state, 'Search accepts an optional query, up to eight tags, and all, on-board, or in-review scope.')
        const query = typeof input.query === 'string' ? input.query.trim().toLocaleLowerCase() : ''
        const tags = Array.isArray(input.tags) ? input.tags.map((tag) => String(tag).trim().toLocaleLowerCase()) : []
        const scope = input.scope ?? 'all'
        const references = [
          ...state.boardItems.filter((item) => item.kind === 'reference' || item.kind === 'agent-addition').map((item) => ({ id: item.id, type: 'board-item' as const, state: 'on-board' as const, title: item.title, sourceUrl: item.sourceUrl, attribution: item.attribution, territory: item.territory, provider: item.captureProvider, tags: item.tags ?? [], pendingTagSuggestions: (item.tagSuggestions ?? []).filter((suggestion) => suggestion.status === 'pending') })),
          ...state.proposals.filter((item) => item.status === 'pending').map((item) => ({ id: item.id, type: 'proposal' as const, state: 'in-review' as const, title: item.title, sourceUrl: item.sourceUrl, attribution: item.attribution, territory: item.intendedTerritory, provider: item.captureProvider, tags: item.tags ?? [], pendingTagSuggestions: (item.tagSuggestions ?? []).filter((suggestion) => suggestion.status === 'pending') })),
        ]
        const matches = references.filter((reference) => {
          if (scope !== 'all' && reference.state !== scope) return false
          const haystack = [reference.title, reference.sourceUrl, reference.attribution, reference.territory, reference.provider, ...reference.tags, ...reference.pendingTagSuggestions.flatMap((suggestion) => suggestion.tags)].filter(Boolean).join(' ').toLocaleLowerCase()
          return (!query || haystack.includes(query)) && tags.every((tag) => reference.tags.map((item) => item.toLocaleLowerCase()).includes(tag))
        })
        return success(state, { results: matches, total: matches.length }, `Found ${matches.length} matching references.`)
      },
    },
    {
      name: 'capture_url_reference', title: 'Capture a URL reference', description: 'Capture normalized page metadata and an embeddable preview through Iterum’s server-side Microlink adapter. Returns a default full crop and never adds the result to the board.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, url: { type: 'string', minLength: 1 } }, required: ['campaignId', 'boardId', 'url'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'url']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || !isPublicHttpUrl(input.url)) return invalid(state, 'Provide the open campaign and one public http(s) URL.')
        try { const payload = await responseJson(await fetch(`/api/references/capture?url=${encodeURIComponent(input.url)}`)); return success(state, payload, `Captured reference metadata from ${new URL(input.url).hostname}.`) }
        catch (error) { return failure(state, 'PROVIDER_UNAVAILABLE', error instanceof Error ? error.message : 'URL capture is unavailable.', true) }
      },
    },
    {
      name: 'search_reference_images', title: 'Search licensed reference images', description: 'Search Pexels through Iterum’s server-side adapter. Results include source links and attribution and are not added to the Review Tray automatically.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, query: { type: 'string', minLength: 2, maxLength: 120 }, count: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['campaignId', 'boardId', 'query'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'query', 'count']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || typeof input.query !== 'string' || input.query.trim().length < 2 || input.query.length > 120 || (input.count !== undefined && (!Number.isInteger(input.count) || (input.count as number) < 1 || (input.count as number) > 12))) return invalid(state, 'Provide the open campaign, a 2–120 character query, and an optional result count from 1–12.')
        try { const payload = await responseJson(await fetch(`/api/references/search?q=${encodeURIComponent(input.query)}&count=${input.count ?? 8}`)); return success(state, payload, `Searched Pexels for “${input.query}”.`) }
        catch (error) { return failure(state, 'PROVIDER_UNAVAILABLE', error instanceof Error ? error.message : 'Pexels search is unavailable.', true) }
      },
    },
    {
      name: 'search_typefaces', title: 'Search embeddable typefaces', description: 'Search open-source typefaces through Fontsource and optional Google Fonts metadata. Commercial results appear only when requested and are always reference-only.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, query: { type: 'string', maxLength: 120 }, category: { type: 'string', enum: ['all', 'serif', 'sans-serif', 'display', 'handwriting', 'monospace'] }, includeCommercial: { type: 'boolean' }, count: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'query', 'category', 'includeCommercial', 'count']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || (input.query !== undefined && (typeof input.query !== 'string' || input.query.length > 120)) || (input.category !== undefined && !['all', 'serif', 'sans-serif', 'display', 'handwriting', 'monospace'].includes(String(input.category))) || (input.includeCommercial !== undefined && typeof input.includeCommercial !== 'boolean') || (input.count !== undefined && (!Number.isInteger(input.count) || Number(input.count) < 1 || Number(input.count) > 12))) return invalid(state, 'Search accepts an optional query, classification, commercial-reference toggle, and result count from 1–12.')
        const params = new URLSearchParams({ q: typeof input.query === 'string' ? input.query : '', category: typeof input.category === 'string' ? input.category : 'all', includeCommercial: String(input.includeCommercial === true), count: String(input.count ?? 8) })
        try { const payload = await responseJson(await fetch(`/api/typefaces/search?${params}`)); return success(state, payload, `Searched typefaces for “${input.query || 'all families'}”.`) }
        catch (error) { return failure(state, 'PROVIDER_UNAVAILABLE', error instanceof Error ? error.message : 'Typeface search is unavailable.', true) }
      },
    },
    {
      name: 'isolate_reference_background', title: 'Isolate a reference subject', description: 'Create a local transparent PNG derivative from a current proposal or board reference using edge-connected background matting. This returns a preview and never replaces the canonical image.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, sourceType: { type: 'string', enum: ['proposal', 'board-item'] }, referenceId: { type: 'string', minLength: 1 }, sensitivity: { type: 'integer', minimum: 10, maximum: 90 } }, required: ['campaignId', 'boardId', 'sourceType', 'referenceId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'sourceType', 'referenceId', 'sensitivity']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || !['proposal', 'board-item'].includes(String(input.sourceType)) || typeof input.referenceId !== 'string' || !input.referenceId || (input.sensitivity !== undefined && (!Number.isInteger(input.sensitivity) || (input.sensitivity as number) < 10 || (input.sensitivity as number) > 90))) return invalid(state, 'Provide a current proposal or board-item reference and an optional sensitivity from 10–90.')
        const source = input.sourceType === 'proposal' ? state.proposals.find((item) => item.id === input.referenceId) : state.boardItems.find((item) => item.id === input.referenceId)
        if (!source) return invalid(state, 'The selected reference is not in the current workspace.')
        const imageUrl = source && 'originalImageUrl' in source ? source.originalImageUrl ?? source.imageUrl : source?.imageUrl
        if (!imageUrl) return invalid(state, 'The selected reference has no readable source image.')
        try { const isolation = await isolateImageBackground(imageUrl, typeof input.sensitivity === 'number' ? input.sensitivity : 50); return success(state, { referenceId: input.referenceId, ...isolation }, `Created a local background-isolation preview for ${source.title}.`) }
        catch (error) { return failure(state, 'EXTRACTION_UNAVAILABLE', error instanceof Error ? error.message : 'Local background isolation failed.', true) }
      },
    },
    {
      name: 'extract_reference_palette', title: 'Extract a reference palette', description: 'Use Iterum’s local deterministic pixel extraction on a current board reference or a centered crop. This does not save or pin any color.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, referenceId: { type: 'string', minLength: 1 }, crop: { type: 'string', enum: ['full', 'center'] } }, required: ['campaignId', 'boardId', 'referenceId', 'crop'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'referenceId', 'crop']) || input.campaignId !== state.campaign.id || input.boardId !== state.campaign.boardId || typeof input.referenceId !== 'string' || !['full', 'center'].includes(String(input.crop))) return invalid(state, 'Provide the open campaign, a board referenceId, and full or center crop.')
        const reference = state.boardItems.find((item) => item.id === input.referenceId)
        if (!reference?.imageUrl?.startsWith('/')) return invalid(state, 'Only current Iterum reference images can be locally extracted.')
        try {
          const colors = await extractPaletteFromImage(reference.imageUrl, input.crop as 'full' | 'center')
          return success(state, { referenceId: reference.id, crop: input.crop, algorithm: 'iterum-pixel-quantize-v1', colors: colors.map((hex) => ({ hex, source: 'local-extraction' as const, role: 'extracted' as const })) }, `Locally extracted ${colors.length} colors from ${reference.title}.`)
        } catch {
          return failure(state, 'EXTRACTION_UNAVAILABLE', 'Local extraction could not read this reference image.', true)
        }
      },
    },
    {
      name: 'suggest_color_scheme', title: 'Suggest a systematic color scheme', description: 'Generate named, systematic color variations from a designer-selected hexadecimal seed through The Color API. Suggestions are not saved or pinned.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, hex: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }, mode: { type: 'string', enum: [...harmonyModes] } }, required: ['campaignId', 'boardId', 'hex', 'mode'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'hex', 'mode']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || !isHex(input.hex) || !harmonyModes.includes(input.mode as typeof harmonyModes[number])) return invalid(state, 'Provide the open campaign, a hexadecimal seed, and a supported harmony mode.')
        try {
          const payload = await responseJson(await fetch(`/api/color/scheme?hex=${encodeURIComponent(input.hex)}&mode=${encodeURIComponent(String(input.mode))}`)) as { colors: unknown }
          return success(state, payload, `Generated a ${input.mode} systematic scheme from ${input.hex}.`)
        } catch (error) { return failure(state, 'PROVIDER_UNAVAILABLE', error instanceof Error ? error.message : 'The Color API is unavailable.', true) }
      },
    },
    {
      name: 'suggest_experimental_palette', title: 'Suggest an experimental palette', description: 'Generate an optional Colormind direction from one or two designer-locked swatches. Colormind may adjust input colors; results are never saved or pinned automatically.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, lockedColors: { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }, minItems: 1, maxItems: 2 } }, required: ['campaignId', 'boardId', 'lockedColors'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['campaignId', 'boardId', 'lockedColors']) || !validContext(state, { campaignId: input.campaignId, boardId: input.boardId }) || !Array.isArray(input.lockedColors) || input.lockedColors.length < 1 || input.lockedColors.length > 2 || !input.lockedColors.every(isHex)) return invalid(state, 'Provide the open campaign and one or two hexadecimal locked colors.')
        try {
          const payload = await responseJson(await fetch('/api/color/experimental', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locked: input.lockedColors }) })) as { colors: unknown; note?: string }
          return success(state, payload, 'Generated an experimental Colormind palette direction.')
        } catch (error) { return failure(state, 'PROVIDER_UNAVAILABLE', error instanceof Error ? error.message : 'Colormind is unavailable.', true) }
      },
    },
    {
      name: 'propose_captured_reference', title: 'Propose a captured reference', description: 'Send a captured or searched reference with provenance and crop metadata to the Review Tray. This never approves the reference or chooses the designer’s final direction.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, reference: { type: 'object', properties: proposalProperties, required: ['id', 'title', 'sourceUrl', 'attribution', 'rightsStatus', 'rationale', 'intendedTerritory', 'crop', 'captureProvider'], additionalProperties: false } }, required: [...requiredMutation, 'reference'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (!hasExactKeys(checked.value, [...requiredMutation, 'reference'])) return invalid(state, 'reference is the only additional accepted field.'); const proposal = parsedProposal(checked.value.reference); if (!proposal || !proposal.crop || !proposal.captureProvider) return invalid(state, 'reference must include public URLs, provenance, rights, and a valid percentage crop.'); return execute(runtime, { type: 'propose-reference', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposal: { ...proposal, directPlacement: false } }) },
    },
    {
      name: 'propose_web_clip', title: 'Propose a web clip', description: 'Send a webpage or image reference to the Review Tray while preserving its source URL. Rights remain uncertain and the clip cannot bypass designer review.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, clip: { type: 'object', properties: { id: { type: 'string', minLength: 1, maxLength: 80 }, title: { type: 'string', minLength: 1, maxLength: 180 }, sourceUrl: { type: 'string', minLength: 1 }, imageUrl: { type: 'string', minLength: 1 }, rationale: { type: 'string', minLength: 1, maxLength: 240 }, intendedTerritory: { type: 'string', minLength: 1, maxLength: 80 } }, required: ['id', 'title', 'sourceUrl'], additionalProperties: false } }, required: [...requiredMutation, 'clip'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const state = runtime.getSnapshot(); const checked = mutationInput(state, input)
        if ('response' in checked) return checked.response
        if (!hasExactKeys(checked.value, [...requiredMutation, 'clip']) || !isObject(checked.value.clip) || !hasExactKeys(checked.value.clip, ['id', 'title', 'sourceUrl', 'imageUrl', 'rationale', 'intendedTerritory'])) return invalid(state, 'clip is the only additional field and accepts sourced clip metadata only.')
        const clip = checked.value.clip
        if (typeof clip.id !== 'string' || !clip.id || clip.id.length > 80 || typeof clip.title !== 'string' || !clip.title.trim() || clip.title.length > 180 || !isPublicHttpUrl(clip.sourceUrl) || (clip.imageUrl !== undefined && !isPublicHttpUrl(clip.imageUrl)) || (clip.rationale !== undefined && (typeof clip.rationale !== 'string' || !clip.rationale.trim() || clip.rationale.length > 240)) || (clip.intendedTerritory !== undefined && (typeof clip.intendedTerritory !== 'string' || !clip.intendedTerritory.trim() || clip.intendedTerritory.length > 80))) return invalid(state, 'Provide a short clip ID and title, one public source URL, and an optional public image URL.')
        const hostname = new URL(clip.sourceUrl).hostname.replace(/^www\./, '')
        return execute(runtime, { type: 'propose-reference', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposal: { id: `web-clip-${clip.id}`, title: clip.title.trim(), ...(typeof clip.imageUrl === 'string' ? { imageUrl: clip.imageUrl } : {}), sourceUrl: clip.sourceUrl, attribution: hostname, rightsStatus: 'uncertain', rationale: typeof clip.rationale === 'string' ? clip.rationale.trim() : `Web clip preserved from ${hostname} for designer review.`, intendedTerritory: typeof clip.intendedTerritory === 'string' ? clip.intendedTerritory.trim() : 'Agent Additions', crop: { x: 0, y: 0, width: 100, height: 100 }, captureProvider: 'web-clipper', directPlacement: false } })
      },
    },
    {
      name: 'propose_reference_tags', title: 'Propose reference tags', description: 'Suggest searchable tags for a current board reference or pending proposal. Suggestions remain pending until the designer approves or rejects them in the Library.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, targetType: { type: 'string', enum: ['proposal', 'board-item'] }, referenceId: { type: 'string', minLength: 1 }, suggestionId: { type: 'string', minLength: 1 }, tags: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 32 }, minItems: 1, maxItems: 8 }, rationale: { type: 'string', minLength: 1, maxLength: 240 } }, required: [...requiredMutation, 'targetType', 'referenceId', 'suggestionId', 'tags', 'rationale'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (!hasExactKeys(checked.value, [...requiredMutation, 'targetType', 'referenceId', 'suggestionId', 'tags', 'rationale']) || !['proposal', 'board-item'].includes(String(checked.value.targetType)) || typeof checked.value.referenceId !== 'string' || !checked.value.referenceId || typeof checked.value.suggestionId !== 'string' || !checked.value.suggestionId || !isTagList(checked.value.tags) || typeof checked.value.rationale !== 'string' || !checked.value.rationale.trim() || checked.value.rationale.length > 240) return invalid(state, 'Provide a current reference, a unique suggestion ID, 1–8 short tags, and a concise rationale.'); return execute(runtime, { type: 'propose-reference-tags', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', targetType: checked.value.targetType as 'proposal' | 'board-item', referenceId: checked.value.referenceId, suggestion: { id: checked.value.suggestionId, tags: checked.value.tags, rationale: checked.value.rationale } }) },
    },
    {
      name: 'propose_type_direction', title: 'Propose a type direction', description: 'Send a sourced headline and body pairing to type review. The agent cannot approve the pairing or embed commercial reference-only faces.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, direction: { type: 'object', properties: { id: { type: 'string', minLength: 1 }, headline: { type: 'object', properties: typefaceProperties, required: ['id', 'family', 'category', 'source', 'sourceLabel', 'license', 'referenceOnly', 'weights', 'styles'], additionalProperties: false }, body: { type: 'object', properties: typefaceProperties, required: ['id', 'family', 'category', 'source', 'sourceLabel', 'license', 'referenceOnly', 'weights', 'styles'], additionalProperties: false }, specimenText: { type: 'string', minLength: 1, maxLength: 180 }, rationale: { type: 'string', minLength: 1, maxLength: 320 } }, required: ['id', 'headline', 'body', 'specimenText', 'rationale'], additionalProperties: false } }, required: [...requiredMutation, 'direction'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => { const state = runtime.getSnapshot(); const checked = mutationInput(state, input); if ('response' in checked) return checked.response; if (!hasExactKeys(checked.value, [...requiredMutation, 'direction'])) return invalid(state, 'direction is the only additional field.'); const direction = parsedTypeDirection(checked.value.direction); if (!direction) return invalid(state, 'Provide strict sourced headline and body candidates, specimen text, and a concise rationale.'); return execute(runtime, { type: 'propose-type-direction', campaignId: checked.value.campaignId as string, boardId: checked.value.boardId as string, expectedVersion: checked.value.expectedBoardVersion as number, idempotencyKey: checked.value.idempotencyKey as string, actor: 'agent', proposal: direction }) },
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
  if (projectController) tools.unshift(
    {
      name: 'list_campaign_projects', title: 'List Iterum projects', description: 'List the designer’s recent cloud-backed Iterum projects with current board and persistence revisions.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, [])) return invalid(state, 'This tool accepts no fields.')
        try { const projects = await projectController.listProjects(); return success(state, { projects }, `Found ${projects.length} cloud project${projects.length === 1 ? '' : 's'}.`) }
        catch (error) { return failure(state, 'PERSISTENCE_UNAVAILABLE', error instanceof Error ? error.message : 'Projects could not be listed.', true) }
      },
    },
    {
      name: 'create_campaign_project', title: 'Create a blank campaign project', description: 'Create a genuinely blank, cloud-backed campaign project from a name and objective. It creates no references, routes, palette, typography, or applications.',
      inputSchema: { type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 120 }, objective: { type: 'string', minLength: 1, maxLength: 500 }, idempotencyKey: { type: 'string', minLength: 1, maxLength: 120 } }, required: ['name', 'objective', 'idempotencyKey'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['name', 'objective', 'idempotencyKey']) || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 || typeof input.objective !== 'string' || !input.objective.trim() || input.objective.length > 500 || typeof input.idempotencyKey !== 'string' || !input.idempotencyKey || input.idempotencyKey.length > 120) return invalid(state, 'Provide a campaign name, objective, and stable idempotency key.')
        try { const project = await projectController.createProject({ name: input.name.trim(), objective: input.objective.trim(), idempotencyKey: input.idempotencyKey }); return success(state, { project, openWith: { tool: 'open_campaign_project', projectKey: project.projectKey } }, `Created blank cloud project “${project.name}”.`) }
        catch (error) { return failure(state, 'PROJECT_CREATE_FAILED', error instanceof Error ? error.message : 'The project could not be created.', true) }
      },
    },
    {
      name: 'open_campaign_project', title: 'Open an Iterum project', description: 'Navigate the visible Iterum workspace to an existing cloud project. This changes the current page but does not modify campaign content.',
      inputSchema: { type: 'object', properties: { projectKey: { type: 'string', minLength: 3, maxLength: 80, pattern: '^[a-z0-9][a-z0-9-]+[a-z0-9]$' } }, required: ['projectKey'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input) => {
        const state = runtime.getSnapshot()
        if (!isObject(input) || !hasExactKeys(input, ['projectKey']) || typeof input.projectKey !== 'string' || !/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(input.projectKey)) return invalid(state, 'Provide one valid projectKey.')
        projectController.openProject(input.projectKey)
        return success(state, { projectKey: input.projectKey, canonicalStateChanged: false }, `Opening cloud project ${input.projectKey}.`, undefined, true)
      },
    },
    {
      name: 'get_project_save_status', title: 'Read project save status', description: 'Read whether the open project is loading, saving, saved, conflicted, or unavailable without changing it.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input) => { const state = runtime.getSnapshot(); if (!validContext(state, input)) return invalid(state, 'Provide the open campaignId and boardId.'); const status = projectController.getStatus(); return success(state, status, status.message) },
    },
    {
      name: 'create_board_snapshot', title: 'Create a board version', description: 'Flush pending autosave work, then create an immutable, named recovery point for the open board.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, label: { type: 'string', minLength: 1, maxLength: 120 } }, required: [...requiredMutation, 'label'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input) => {
        const state = runtime.getSnapshot(); const checked = mutationInput(state, input)
        if ('response' in checked) return checked.response
        if (!hasExactKeys(checked.value, [...requiredMutation, 'label']) || checked.value.expectedBoardVersion !== state.version || typeof checked.value.label !== 'string' || !checked.value.label.trim() || checked.value.label.length > 120) return invalid(state, 'Provide the current board version, a stable idempotency key, and a short version label.')
        try { const version = await projectController.createVersion(checked.value.label.trim(), 'agent', checked.value.idempotencyKey as string); return success(runtime.getSnapshot(), { version }, `Created immutable board version “${version.label}”.`) }
        catch (error) { return failure(runtime.getSnapshot(), 'SNAPSHOT_FAILED', error instanceof Error ? error.message : 'The board version could not be created.', true) }
      },
    },
    {
      name: 'list_board_versions', title: 'List board versions', description: 'List immutable snapshots and restores for the open cloud project.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' } }, required: ['campaignId', 'boardId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input) => {
        const state = runtime.getSnapshot()
        if (!validContext(state, input)) return invalid(state, 'Provide the open campaignId and boardId.')
        try { const versions = await projectController.listVersions(); return success(state, { versions }, `Found ${versions.length} recovery point${versions.length === 1 ? '' : 's'} for this project.`) }
        catch (error) { return failure(state, 'VERSIONS_UNAVAILABLE', error instanceof Error ? error.message : 'Board versions could not be listed.', true) }
      },
    },
    {
      name: 'restore_board_version', title: 'Restore a board version', description: 'Restore one immutable version as a new project head. The current head remains in history; version numbers never move backward.',
      inputSchema: { type: 'object', properties: { ...mutationProperties, versionId: { type: 'string', minLength: 1 } }, required: [...requiredMutation, 'versionId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input) => {
        const state = runtime.getSnapshot(); const checked = mutationInput(state, input)
        if ('response' in checked) return checked.response
        if (!hasExactKeys(checked.value, [...requiredMutation, 'versionId']) || checked.value.expectedBoardVersion !== state.version || typeof checked.value.versionId !== 'string' || !checked.value.versionId) return invalid(state, 'Provide the current board version, one versionId, and a stable idempotency key.')
        try { const restored = await projectController.restoreVersion(checked.value.versionId, 'agent', checked.value.idempotencyKey as string); return success(restored.state, { restoredVersionId: checked.value.versionId, saveStatus: restored.status }, `Restored ${checked.value.versionId} as board version ${restored.state.version}.`, undefined, true) }
        catch (error) { return failure(runtime.getSnapshot(), 'RESTORE_FAILED', error instanceof Error ? error.message : 'The board version could not be restored.', true) }
      },
    },
  )
  if (projectController?.imageGeneration) tools.push(...createImageGenerationTools(runtime, projectController, reviewUi))
  try { for (const tool of tools) await document.modelContext.registerTool(tool, { signal: controller.signal }) } catch (error) { controller.abort(); throw error }
  return { controller, count: tools.length }
}
