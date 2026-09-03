import { createBoardOrganizationProposal } from './board-organization'
import type { BoardLayoutProposal, CreativeTerritoryRequest, WorkspaceState } from './types'

type TerritoryFailure = { ok: false; code: 'INVALID_BOARD_ORGANIZATION' | 'BOARD_ORGANIZATION_EMPTY'; message: string }
type TerritorySuccess = { ok: true; proposal: Omit<BoardLayoutProposal, 'status'> }

const HEX = /^#[0-9A-F]{6}$/i
const concise = (value: string, maximum: number) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximum

export function createCreativeTerritoryProposal(state: WorkspaceState, request: CreativeTerritoryRequest): TerritorySuccess | TerritoryFailure {
  const route = state.creativeRoutes.find((candidate) => candidate.id === request.routeId && candidate.status !== 'rejected')
  const itemById = new Map(state.boardItems.map((item) => [item.id, item]))
  const referenceIds = request.references.map((reference) => reference.itemId)
  const hierarchyIds = [request.hierarchy.heroItemId, ...request.hierarchy.primaryItemIds, ...request.hierarchy.supportingItemIds]
  const relationshipIds = request.relationships.flatMap((relationship) => [relationship.fromItemId, relationship.toItemId])
  const referencedIds = new Set(referenceIds)

  const valid = concise(request.id, 80) && concise(request.title, 120) && Boolean(route)
    && concise(request.thesis, 400) && concise(request.mood, 180) && ['restrained', 'balanced', 'dense'].includes(request.density)
    && request.groupingSignals.length >= 1 && request.groupingSignals.length <= 8 && request.groupingSignals.every((signal) => concise(signal, 80))
    && request.references.length >= 2 && request.references.length <= 3 && referencedIds.size === request.references.length
    && request.references.every((reference) => itemById.has(reference.itemId) && ['image-treatment', 'composition', 'materiality'].includes(reference.contribution) && concise(reference.annotation, 240))
    && hierarchyIds.length >= 1 && new Set(hierarchyIds).size === hierarchyIds.length && hierarchyIds.every((id) => itemById.has(id))
    && itemById.get(request.typography.headlineItemId)?.kind === 'type-specimen' && itemById.get(request.typography.bodyItemId)?.kind === 'type-specimen'
    && hierarchyIds.includes(request.typography.headlineItemId) && hierarchyIds.includes(request.typography.bodyItemId)
    && concise(request.typography.relationship, 240) && Number.isFinite(request.typography.scaleRatio) && request.typography.scaleRatio >= 1 && request.typography.scaleRatio <= 12
    && request.palette.length >= 3 && request.palette.length <= 5 && request.palette.every((swatch) => HEX.test(swatch.hex) && concise(swatch.name, 80) && ['ground', 'accent', 'support', 'type'].includes(swatch.role))
    && ['ground', 'accent', 'type'].every((role) => request.palette.some((swatch) => swatch.role === role))
    && request.relationships.length >= 1 && request.relationships.length <= 6 && relationshipIds.every((id) => referencedIds.has(id))
    && request.relationships.every((relationship) => relationship.fromItemId !== relationship.toItemId && ['contrast', 'echo', 'sequence', 'material-bridge'].includes(relationship.kind) && concise(relationship.rationale, 240))
    && itemById.get(request.application.itemId)?.kind === 'campaign-proof' && concise(request.application.format, 80) && concise(request.application.caption, 240)

  if (!valid) return { ok: false, code: 'INVALID_BOARD_ORGANIZATION', message: 'A creative territory needs one current route, 2–3 references, explicit hierarchy, two type specimens, 3–5 role-based colors, reference relationships, and one campaign application.' }

  const organized = createBoardOrganizationProposal(state, {
    id: request.id,
    title: request.title,
    scope: { type: 'route', routeId: request.routeId },
    strategy: 'type',
    layout: 'cluster-grid',
    maximumGroups: 3,
    ranking: 'board-order',
    briefKeywords: request.groupingSignals,
  })
  if (!organized.ok) return organized
  const assignments = organized.proposal.organization?.assignments ?? []
  const generatedRoles = {
    hero: assignments.filter((assignment) => assignment.role === 'hero').map((assignment) => assignment.itemId),
    primary: assignments.filter((assignment) => assignment.role === 'primary').map((assignment) => assignment.itemId).sort(),
    supporting: assignments.filter((assignment) => assignment.role === 'supporting').map((assignment) => assignment.itemId).sort(),
  }
  if (generatedRoles.hero[0] !== request.hierarchy.heroItemId || generatedRoles.primary.join('|') !== [...request.hierarchy.primaryItemIds].sort().join('|') || generatedRoles.supporting.join('|') !== [...request.hierarchy.supportingItemIds].sort().join('|')) return { ok: false, code: 'INVALID_BOARD_ORGANIZATION', message: 'The requested Hero, Primary, and Supporting roles conflict with the generated route hierarchy. Adjust the hierarchy intent before submitting the territory.' }

  return {
    ok: true,
    proposal: {
      ...organized.proposal,
      title: request.title.trim(),
      rationale: request.thesis.trim(),
      creativeTerritory: {
        ...request,
        title: request.title.trim(),
        thesis: request.thesis.trim(),
        mood: request.mood.trim(),
        groupingSignals: request.groupingSignals.map((signal) => signal.trim()),
        origin: 'iterum-creative-territory-v1',
        baselineBoardVersion: state.version,
      },
    },
  }
}
