import type {
  BoardItem,
  BoardLayoutProposal,
  BoardOrganizationGroup,
  BoardOrganizationRequest,
  BoardOrganizationScope,
  CreativeRoute,
  HierarchyRole,
  WorkspaceState,
} from './types'

const GRID = 8
const GAP = 16

type Bounds = { x: number; y: number; width: number; height: number }
type OrganizationFailure = { ok: false; code: 'INVALID_BOARD_ORGANIZATION' | 'BOARD_ORGANIZATION_EMPTY'; message: string }
type OrganizationSuccess = { ok: true; proposal: Omit<BoardLayoutProposal, 'status'> }

const snap = (value: number) => Math.round(value / GRID) * GRID
const snapDown = (value: number) => Math.floor(value / GRID) * GRID
const normalizedTag = (value: string) => value.trim().toLocaleLowerCase()
const slug = (value: string) => normalizedTag(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'signals'
const labelForKind = (kind: BoardItem['kind']) => ({
  reference: 'Reference images',
  'agent-addition': 'Agent discoveries',
  'type-specimen': 'Typography',
  note: 'Direction notes',
  'campaign-proof': 'Campaign applications',
  'color-strip': 'Color systems',
})[kind]

function itemBounds(items: BoardItem[]): Bounds {
  const x = Math.min(...items.map((item) => item.position.x))
  const y = Math.min(...items.map((item) => item.position.y))
  const right = Math.max(...items.map((item) => item.position.x + item.width))
  const bottom = Math.max(...items.map((item) => item.position.y + item.height))
  return { x: snap(x), y: snap(y), width: Math.max(320, snap(right - x)), height: Math.max(480, snap(bottom - y)) }
}

function routeForScope(state: WorkspaceState, scope: BoardOrganizationScope): CreativeRoute | undefined {
  return scope.type === 'route' ? state.creativeRoutes.find((route) => route.id === scope.routeId && route.status !== 'rejected') : undefined
}

export function boardItemsForOrganizationScope(state: WorkspaceState, scope: BoardOrganizationScope): BoardItem[] {
  if (scope.type === 'whole-board') return [...state.boardItems]
  if (scope.type === 'selection') {
    const selected = new Set(scope.itemIds)
    return state.boardItems.filter((item) => selected.has(item.id))
  }
  const territory = scope.type === 'route' ? routeForScope(state, scope)?.territory : scope.territory
  return territory ? state.boardItems.filter((item) => item.territory === territory) : []
}

function boundsForScope(state: WorkspaceState, scope: BoardOrganizationScope, items: BoardItem[]): Bounds {
  const route = routeForScope(state, scope)
  if (route) return {
    x: snap(route.frame.position.x + GAP),
    y: snap(route.frame.position.y + GAP),
    width: Math.max(160, snapDown(route.frame.width - GAP * 2)),
    height: Math.max(240, snapDown(route.frame.height - GAP * 2)),
  }
  const bounds = itemBounds(items)
  return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
}

function requestedScopeIsValid(state: WorkspaceState, scope: BoardOrganizationScope) {
  if (scope.type === 'route') return Boolean(routeForScope(state, scope))
  if (scope.type === 'territory') return Boolean(scope.territory.trim())
  if (scope.type === 'selection') return scope.itemIds.length > 0 && new Set(scope.itemIds).size === scope.itemIds.length && scope.itemIds.every((id) => state.boardItems.some((item) => item.id === id))
  return scope.type === 'whole-board'
}

type Bucket = { label: string; items: BoardItem[]; confidence: number; rationale: string }

function tagBuckets(items: BoardItem[]): { buckets: Bucket[]; unresolved: Array<{ itemId: string; reason: string }> } {
  const frequencies = new Map<string, number>()
  items.forEach((item) => [...new Set((item.tags ?? []).map(normalizedTag).filter(Boolean))].forEach((tag) => frequencies.set(tag, (frequencies.get(tag) ?? 0) + 1)))
  const byLabel = new Map<string, BoardItem[]>()
  const unresolved: Array<{ itemId: string; reason: string }> = []
  items.forEach((item) => {
    const tags = [...new Set((item.tags ?? []).map(normalizedTag).filter(Boolean))]
      .sort((a, b) => (frequencies.get(b) ?? 0) - (frequencies.get(a) ?? 0) || a.localeCompare(b))
    const label = tags[0]
    if (!label) { unresolved.push({ itemId: item.id, reason: 'No approved tag is available for deterministic grouping.' }); return }
    byLabel.set(label, [...(byLabel.get(label) ?? []), item])
  })
  return {
    buckets: [...byLabel.entries()].map(([label, members]) => ({ label, items: members, confidence: members.length > 1 ? .9 : .68, rationale: members.length > 1 ? `These references share the approved tag “${label}”.` : `This reference is currently the only approved “${label}” signal.` })),
    unresolved,
  }
}

function typeBuckets(items: BoardItem[]): Bucket[] {
  const byType = new Map<BoardItem['kind'], BoardItem[]>()
  items.forEach((item) => byType.set(item.kind, [...(byType.get(item.kind) ?? []), item]))
  return [...byType.entries()].map(([kind, members]) => ({ label: labelForKind(kind), items: members, confidence: .96, rationale: `These items share the Iterum board type “${kind}”.` }))
}

function limitAndMergeBuckets(buckets: Bucket[], maximumGroups: number): Bucket[] {
  const ordered = [...buckets].sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label))
  if (ordered.length <= maximumGroups) {
    const sparse = ordered.filter((bucket) => bucket.items.length === 1)
    const substantial = ordered.filter((bucket) => bucket.items.length > 1)
    if (sparse.length > 1 && substantial.length + 1 <= maximumGroups) return [...substantial, {
      label: 'Supporting signals', items: sparse.flatMap((bucket) => bucket.items), confidence: .62,
      rationale: 'Sparse one-off signals are kept together for designer review instead of being overstated as separate directions.',
    }]
    return ordered
  }
  const kept = ordered.slice(0, Math.max(1, maximumGroups - 1))
  const remainder = ordered.slice(kept.length)
  return [...kept, {
    label: 'Supporting signals', items: remainder.flatMap((bucket) => bucket.items), confidence: .58,
    rationale: `The remaining ${remainder.length} sparse clusters are held together to respect the ${maximumGroups}-group limit.`,
  }]
}

function hierarchy(items: BoardItem[], ranking: BoardOrganizationRequest['ranking']): BoardItem[] {
  return [...items].sort((a, b) => ranking === 'visual-weight'
    ? (b.width * b.height) - (a.width * a.height) || a.id.localeCompare(b.id)
    : a.position.y - b.position.y || a.position.x - b.position.x || a.id.localeCompare(b.id))
}

function roleForIndex(index: number): HierarchyRole {
  return index === 0 ? 'hero' : index < 3 ? 'primary' : 'supporting'
}

function sizedForRole(item: BoardItem, role: HierarchyRole, regionWidth: number) {
  const minimumHeight = item.kind === 'color-strip' ? 16 : 60
  const widthRatio = role === 'hero' ? 1 : role === 'primary' ? .76 : .6
  const width = Math.max(80, snapDown(regionWidth * widthRatio))
  const height = Math.max(minimumHeight, snapDown(Math.min(280, item.height * (width / item.width))))
  return { width, height }
}

function overlaps(a: Bounds, b: Bounds) {
  return a.x < b.x + b.width + GRID && a.x + a.width + GRID > b.x && a.y < b.y + b.height + GRID && a.y + a.height + GRID > b.y
}

function placementY(x: number, startY: number, width: number, height: number, obstacles: Bounds[]) {
  let y = startY
  for (let pass = 0; pass < obstacles.length + 1; pass += 1) {
    const collisions = obstacles.filter((obstacle) => overlaps({ x, y, width, height }, obstacle))
    if (!collisions.length) return y
    y = snap(Math.max(...collisions.map((obstacle) => obstacle.y + obstacle.height)) + GAP)
  }
  return y
}

function placementInsideRegion(item: BoardItem, role: HierarchyRole, region: Bounds, startY: number, obstacles: Bounds[]) {
  const ideal = sizedForRole(item, role, region.width)
  const minimumWidth = Math.max(80, snapDown(ideal.width * .7))
  for (let width = ideal.width; width >= minimumWidth; width -= GRID) {
    const minimumHeight = item.kind === 'color-strip' ? 16 : 60
    const height = Math.max(minimumHeight, snapDown(Math.min(280, item.height * (width / item.width))))
    const availableOffset = region.width - width
    const preferredOffsets = role === 'primary'
      ? [availableOffset, 0, snapDown(availableOffset / 2)]
      : role === 'supporting'
        ? [Math.min(GRID * 2, availableOffset), 0, availableOffset]
        : [0, availableOffset, snapDown(availableOffset / 2)]
    for (const offset of [...new Set(preferredOffsets)]) {
      const x = snap(region.x + offset)
      const y = placementY(x, snap(startY), width, height, obstacles)
      if (x >= region.x && x + width <= region.x + region.width && y + height <= region.y + region.height) return { x, y, width, height }
    }
  }
  return null
}

function validRequest(request: BoardOrganizationRequest) {
  return Boolean(request.id.trim() && request.id.length <= 80 && request.title.trim() && request.title.length <= 120)
    && ['tag', 'type'].includes(request.strategy) && request.layout === 'cluster-grid'
    && ['visual-weight', 'board-order'].includes(request.ranking)
    && Number.isInteger(request.maximumGroups) && request.maximumGroups >= 1 && request.maximumGroups <= 6
    && (request.briefKeywords === undefined || (request.briefKeywords.length <= 8 && request.briefKeywords.every((keyword) => keyword.trim().length > 0 && keyword.length <= 80)))
}

export function createBoardOrganizationProposal(state: WorkspaceState, request: BoardOrganizationRequest): OrganizationSuccess | OrganizationFailure {
  if (!validRequest(request) || !requestedScopeIsValid(state, request.scope)) return { ok: false, code: 'INVALID_BOARD_ORGANIZATION', message: 'Choose a current route, territory, selection, or explicit whole-board scope with supported organization settings.' }
  const scopeItems = boardItemsForOrganizationScope(state, request.scope)
  if (!scopeItems.length) return { ok: false, code: 'BOARD_ORGANIZATION_EMPTY', message: 'The requested organization scope contains no current board items.' }
  const locked = scopeItems.filter((item) => item.locked)
  const movable = scopeItems.filter((item) => !item.locked)
  if (!movable.length) return { ok: false, code: 'BOARD_ORGANIZATION_EMPTY', message: 'Every item in this scope is locked. Unlock at least one reference before organizing it.' }

  const grouped = request.strategy === 'tag' ? tagBuckets(movable) : { buckets: typeBuckets(movable), unresolved: [] }
  const buckets = limitAndMergeBuckets(grouped.buckets, request.maximumGroups)
  const scopeBounds = boundsForScope(state, request.scope, scopeItems)
  const movableIds = new Set(movable.map((item) => item.id))
  const placementObstacles: Bounds[] = state.boardItems
    .filter((item) => !movableIds.has(item.id))
    .map((item) => ({ ...item.position, width: item.width, height: item.height }))
  const regionGap = buckets.length > 1 ? GAP : 0
  const regionWidth = Math.max(80, snapDown((scopeBounds.width - regionGap * (buckets.length - 1)) / Math.max(1, buckets.length)))
  const changes: BoardLayoutProposal['changes'] = []
  const assignments: NonNullable<BoardLayoutProposal['organization']>['assignments'] = []
  const groups: BoardOrganizationGroup[] = []
  const unresolvedItems = [...grouped.unresolved]

  buckets.forEach((bucket, groupIndex) => {
    const groupId = `${request.id}-group-${slug(bucket.label)}-${groupIndex + 1}`
    const groupLabel = bucket.label.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
    const ranked = hierarchy(bucket.items, request.ranking)
    const regionX = snap(scopeBounds.x + groupIndex * (regionWidth + regionGap))
    const region = { x: regionX, y: scopeBounds.y, width: regionWidth, height: scopeBounds.height }
    let cursorY = scopeBounds.y
    const memberIds: string[] = []
    ranked.forEach((item, itemIndex) => {
      const role = roleForIndex(itemIndex)
      const placement = placementInsideRegion(item, role, region, cursorY, placementObstacles)
      if (!placement) {
        unresolvedItems.push({ itemId: item.id, reason: 'No collision-free cluster-grid slot remains inside the requested scope.' })
        return
      }
      const { x, y, width, height } = placement
      const confidence = Math.max(.5, Math.min(1, bucket.confidence - itemIndex * .03))
      const rationale = role === 'hero' ? `Largest ${request.ranking === 'visual-weight' ? 'visual signal' : 'first board signal'} anchors ${groupLabel}.` : `${role === 'primary' ? 'Primary' : 'Supporting'} evidence for ${groupLabel}.`
      changes.push({ itemId: item.id, position: { x, y }, width, height, groupId, groupLabel, hierarchyRole: role, hierarchyConfidence: confidence })
      assignments.push({ itemId: item.id, groupId, groupLabel, role, confidence, rationale })
      memberIds.push(item.id)
      placementObstacles.push({ x, y, width, height })
      cursorY = y + height + GAP
    })
    if (memberIds.length) groups.push({ id: groupId, label: groupLabel, itemIds: memberIds, heroItemId: memberIds[0], confidence: bucket.confidence, rationale: bucket.rationale })
  })

  if (!changes.length) return { ok: false, code: 'BOARD_ORGANIZATION_EMPTY', message: 'No references could be placed inside the requested scope without disturbing locked material.' }
  const scopeLabel = request.scope.type === 'route' ? routeForScope(state, request.scope)?.name : request.scope.type === 'territory' ? request.scope.territory : request.scope.type === 'selection' ? `${request.scope.itemIds.length} selected items` : 'the whole board'
  return {
    ok: true,
    proposal: {
      id: request.id,
      title: request.title.trim(),
      rationale: `Organizes ${scopeLabel} into ${groups.length} readable ${request.strategy} cluster${groups.length === 1 ? '' : 's'}, while preserving ${locked.length} locked item${locked.length === 1 ? '' : 's'} for designer review.`,
      changes,
      notes: [],
      organization: {
        origin: 'iterum-organize-v1', baselineBoardVersion: state.version, scope: request.scope, strategy: request.strategy,
        layout: 'cluster-grid', ranking: request.ranking, maximumGroups: request.maximumGroups,
        groups, assignments, unresolvedItems, untouchedLockedItemIds: locked.map((item) => item.id),
      },
    },
  }
}
