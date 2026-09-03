import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { createElement } from 'react'

import { createDemoWorkspaceState } from '../domain/demo-data'
import { createFullCampaignDemoState } from '../domain/full-campaign-demo-data'
import { createWorkspaceRuntime } from '../domain/workspace-runtime'
import { registerIterumTools, type PresentationUiState } from './register-tools'
import { useWebMcpTools } from '../../hooks/use-webmcp-tools'
import type { ProjectController } from '../persistence/project-controller'

const runtime = () => createWorkspaceRuntime(createDemoWorkspaceState())

afterEach(() => { delete document.modelContext })

describe('registerIterumTools', () => {
  it('falls back without a browser API', async () => expect(await registerIterumTools(runtime())).toBeNull())

  it('registers forty strict tools sequentially and returns versioned errors and receipts', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown; inputSchema: Record<string, unknown>; annotations?: { untrustedContentHint?: boolean } }> = []
    const signals: AbortSignal[] = []
    document.modelContext = { registerTool: vi.fn(async (tool, options) => { registered.push(tool); signals.push(options?.signal!); return undefined }) }
    const work = runtime()
    const result = await registerIterumTools(work)
    expect(result?.count).toBe(40)
    expect(registered.map((tool) => tool.name)).toEqual(['get_campaign_context', 'update_campaign_brief', 'request_campaign_brief_lock', 'propose_creative_routes', 'request_creative_route_decision', 'get_board_display_mode', 'set_board_display_mode', 'prepare_direction_presentation', 'get_board_viewport', 'focus_board_items', 'set_board_viewport', 'reset_board_viewport', 'get_board_items', 'get_board_structure', 'propose_board_organization', 'propose_creative_territory', 'preview_board_organization', 'explain_board_group', 'add_board_note', 'propose_board_layout', 'preview_board_layout', 'apply_board_layout', 'group_board_items', 'assign_board_territory', 'search_reference_library', 'capture_url_reference', 'search_reference_images', 'search_typefaces', 'isolate_reference_background', 'extract_reference_palette', 'suggest_color_scheme', 'suggest_experimental_palette', 'propose_captured_reference', 'propose_web_clip', 'propose_reference_tags', 'propose_type_direction', 'propose_reference', 'approve_reference', 'reject_reference', 'undo_action'])
    expect(registered.every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true)
    expect(signals).toHaveLength(40)
    expect(signals.every((signal) => signal === result?.controller.signal)).toBe(true)
    expect(registered.every((tool) => tool.annotations?.untrustedContentHint === true)).toBe(true)
    const approve = registered.find((tool) => tool.name === 'approve_reference')!
    const stale = await approve.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 999, idempotencyKey: 'stale', proposalId: 'proposal-resin' }, { signal: new AbortController().signal }) as { ok: boolean; error?: { code: string } }
    expect(stale).toMatchObject({ ok: false, error: { code: 'VERSION_CONFLICT' } })
    const policy = work.dispatch({ type: 'set-placement-policy', campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedVersion: 3, idempotencyKey: 'policy', actor: 'designer', placementPolicy: { allowAgentDirectPlacement: true, directPlacementTerritory: 'Agent Additions' } })
    expect(policy.ok).toBe(true)
    const receipt = await approve.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 4, idempotencyKey: 'approve', proposalId: 'proposal-resin' }, { signal: new AbortController().signal }) as { ok: boolean; receipt?: { id: string } }
    expect(receipt.ok).toBe(true)
    expect(receipt.receipt?.id).toBeTruthy()
    result?.controller.abort()
    expect(result?.controller.signal.aborted).toBe(true)
  })

  it('aborts the shared signal if a sequential registration fails', async () => {
    const controller = new AbortController()
    const signals: AbortSignal[] = []
    document.modelContext = { registerTool: vi.fn(async (_tool, options) => { signals.push(options?.signal!); if (signals.length === 3) throw new Error('registration failed'); return undefined }) }
    await expect(registerIterumTools(runtime(), controller)).rejects.toThrow('registration failed')
    expect(signals).toHaveLength(3)
    expect(signals.every((signal) => signal === controller.signal)).toBe(true)
    expect(controller.signal.aborted).toBe(true)
  })

  it('reads and changes only the presentation viewport through WebMCP', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const work = runtime()
    let viewport = { x: 0, y: 0, scale: 1 }
    let mode: 'fit' | 'custom' = 'custom'
    await registerIterumTools(work, new AbortController(), {
      getViewport: () => viewport,
      getViewportSize: () => ({ width: 800, height: 600 }),
      setViewport: (next, nextMode = 'custom') => { viewport = next; mode = nextMode },
    })
    const context = { signal: new AbortController().signal }
    const read = registered.find((tool) => tool.name === 'get_board_viewport')!
    const initial = await read.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom' }, context) as { ok: boolean; data: { visibleItems: Array<{ id: string }> }; ui: { updated: boolean } }
    expect(initial.ok).toBe(true)
    expect(initial.data.visibleItems.some((item) => item.id === 'type-specimen-headline')).toBe(true)
    expect(initial.ui.updated).toBe(false)

    const focus = registered.find((tool) => tool.name === 'focus_board_items')!
    const focused = await focus.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', territory: 'Type pressure' }, context) as { ok: boolean; boardVersion: number; data: { focusedItems: Array<{ id: string }> }; ui: { updated: boolean } }
    expect(focused.data.focusedItems).toHaveLength(3)
    expect(focused.ui.updated).toBe(true)
    expect(focused.boardVersion).toBe(3)
    expect(work.getSnapshot().receipts).toHaveLength(0)

    const set = registered.find((tool) => tool.name === 'set_board_viewport')!
    await set.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', zoom: 1.5, center: { x: 900, y: 650 } }, context)
    expect(viewport.scale).toBe(1.5)
    expect(mode).toBe('custom')

    const reset = registered.find((tool) => tool.name === 'reset_board_viewport')!
    await reset.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom' }, context)
    expect(mode).toBe('fit')
    expect(work.getSnapshot().version).toBe(3)
  })

  it('reads, switches, and prepares an approved direction using presentation-only WebMCP state', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const work = createWorkspaceRuntime(createFullCampaignDemoState())
    let viewport = { x: 0, y: 0, scale: 1 }
    let viewportMode: 'fit' | 'custom' = 'custom'
    let display: PresentationUiState = { mode: 'working', selectedItemId: 'campaign-proof-pivot', previewProposalId: 'preview-1', workspaceMode: 'layers', activeTool: 'organize', drawers: { brief: true, review: true } }
    await registerIterumTools(work, new AbortController(), {
      getViewport: () => viewport,
      getViewportSize: () => ({ width: 900, height: 700 }),
      setViewport: (next, mode = 'custom') => { viewport = next; viewportMode = mode },
    }, undefined, {
      getDisplayState: () => display,
      setDisplayMode: (mode) => { display = { ...display, mode } },
      preparePresentation: () => { display = { mode: 'presentation', selectedItemId: null, previewProposalId: null, workspaceMode: 'mechanical', activeTool: 'select', drawers: { brief: false, review: false } } },
    })
    const context = { signal: new AbortController().signal }
    const read = registered.find((tool) => tool.name === 'get_board_display_mode')!
    const initial = await read.execute({ campaignId: 'campaign-pivot-one', boardId: 'board-pivot-one' }, context) as { data: { mode: string }; boardVersion: number; ui: { updated: boolean } }
    expect(initial).toMatchObject({ data: { mode: 'working' }, boardVersion: 18, ui: { updated: false } })

    const set = registered.find((tool) => tool.name === 'set_board_display_mode')!
    const switched = await set.execute({ campaignId: 'campaign-pivot-one', boardId: 'board-pivot-one', mode: 'presentation' }, context) as { data: { mode: string }; ui: { updated: boolean } }
    expect(switched).toMatchObject({ data: { mode: 'presentation' }, ui: { updated: true } })
    expect(work.getSnapshot().version).toBe(18)
    expect(work.getSnapshot().receipts).toHaveLength(4)

    display = { ...display, selectedItemId: 'campaign-proof-pivot', previewProposalId: 'preview-1', workspaceMode: 'layers', activeTool: 'organize', drawers: { brief: true, review: true } }
    const prepare = registered.find((tool) => tool.name === 'prepare_direction_presentation')!
    const prepared = await prepare.execute({ campaignId: 'campaign-pivot-one', boardId: 'board-pivot-one', routeId: 'route-modular-signal' }, context) as { ok: boolean; data: { route: { status: string }; presentation: { mode: string; selectedItemId: string | null; drawers: { brief: boolean; review: boolean } }; includedItems: unknown[]; heroItems: unknown[] }; ui: { updated: boolean } }
    expect(prepared.ok).toBe(true)
    expect(prepared.data.route.status).toBe('approved')
    expect(prepared.data.presentation).toMatchObject({ mode: 'presentation', selectedItemId: null, drawers: { brief: false, review: false } })
    expect(prepared.data.includedItems).toHaveLength(8)
    expect(prepared.data.heroItems).toHaveLength(1)
    expect(viewportMode).toBe('fit')
    expect(work.getSnapshot().version).toBe(18)

    const blocked = await prepare.execute({ campaignId: 'campaign-pivot-one', boardId: 'board-pivot-one', routeId: 'route-object-theatre' }, context) as { ok: boolean; error?: { code: string } }
    expect(blocked).toMatchObject({ ok: false, error: { code: 'CREATIVE_ROUTE_NOT_APPROVED' } })
  })

  it('exposes cloud project, autosave, snapshot, and recovery tools through an injected controller', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const work = runtime()
    const restoredState = { ...work.getSnapshot(), version: 9 }
    const projectController: ProjectController = {
      getStatus: () => ({ phase: 'saved', projectKey: 'static-bloom-123', headRevision: 4, savedWorkspaceVersion: 3, lastSavedAt: 100, message: 'Saved to Convex' }),
      listProjects: vi.fn(async () => [{ id: 'project-1', projectKey: 'static-bloom-123', name: 'Static Bloom', campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', workspaceVersion: 3, headRevision: 4, createdAt: 50, updatedAt: 100 }]),
      createProject: vi.fn(async (input) => ({ id: 'project-2', projectKey: 'new-campaign-456', name: input.name, campaignId: 'campaign-new', boardId: 'board-new', workspaceVersion: 0, headRevision: 1, createdAt: 101, updatedAt: 101 })),
      openProject: vi.fn(),
      flush: vi.fn(async () => ({ phase: 'saved' as const, projectKey: 'static-bloom-123', headRevision: 4, savedWorkspaceVersion: 3, lastSavedAt: 100, message: 'Saved to Convex' })),
      createVersion: vi.fn(async (label) => ({ id: 'version-1', label, kind: 'snapshot' as const, actor: 'agent' as const, workspaceVersion: 3, headRevision: 4, createdAt: 102 })),
      listVersions: vi.fn(async () => [{ id: 'version-1', label: 'Direction approved', kind: 'snapshot' as const, actor: 'designer' as const, workspaceVersion: 3, headRevision: 4, createdAt: 102 }]),
      restoreVersion: vi.fn(async () => ({ state: restoredState, status: { phase: 'saved' as const, projectKey: 'static-bloom-123', headRevision: 5, savedWorkspaceVersion: 9, lastSavedAt: 103, message: 'Version restored as a new project head' } })),
    }
    const result = await registerIterumTools(work, new AbortController(), undefined, undefined, undefined, projectController)
    expect(result?.count).toBe(47)
    expect(registered.map((tool) => tool.name)).toEqual(expect.arrayContaining(['list_campaign_projects', 'create_campaign_project', 'open_campaign_project', 'get_project_save_status', 'create_board_snapshot', 'list_board_versions', 'restore_board_version']))
    const context = { signal: new AbortController().signal }
    const projects = await registered.find((tool) => tool.name === 'list_campaign_projects')!.execute({}, context) as { ok: boolean; data: { projects: unknown[] } }
    expect(projects).toMatchObject({ ok: true, data: { projects: [{ projectKey: 'static-bloom-123' }] } })
    const created = await registered.find((tool) => tool.name === 'create_campaign_project')!.execute({ name: 'New Campaign', objective: 'Start from an empty board.', idempotencyKey: 'create-new' }, context) as { ok: boolean; data: { project: { projectKey: string } } }
    expect(created).toMatchObject({ ok: true, data: { project: { projectKey: 'new-campaign-456' } } })
    const versioned = await registered.find((tool) => tool.name === 'create_board_snapshot')!.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'snapshot-1', label: 'Direction approved' }, context) as { ok: boolean; data: { version: { id: string } } }
    expect(versioned).toMatchObject({ ok: true, data: { version: { id: 'version-1' } } })
    const restored = await registered.find((tool) => tool.name === 'restore_board_version')!.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'restore-1', versionId: 'version-1' }, context) as { ok: boolean; boardVersion: number }
    expect(restored).toMatchObject({ ok: true, boardVersion: 9 })
  })

  it('proposes and previews a Direction Draft while reserving application for the designer', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const work = runtime()
    const previewLayoutProposal = vi.fn()
    const openReview = vi.fn()
    await registerIterumTools(work, new AbortController(), undefined, { previewLayoutProposal, openReview })
    const context = { signal: new AbortController().signal }
    const propose = registered.find((tool) => tool.name === 'propose_board_layout')!
    const response = await propose.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'direction-draft', layout: { id: 'draft-severe', title: 'Severe editorial direction', rationale: 'Compress the type system and add a clear art-direction note.', changes: [{ itemId: 'type-specimen-headline', position: { x: 720, y: 430 }, width: 340, height: 190, groupId: 'type-system', groupLabel: 'Type pressure system' }, { itemId: 'type-specimen-body', groupId: 'type-system', groupLabel: 'Type pressure system' }, { itemId: 'campaign-proof-static-bloom', locked: true }], notes: [{ id: 'note-severe', title: 'Hold the pressure', body: 'Keep the type compressed and severe.', tone: 'ruby', territory: 'Type pressure', position: { x: 420, y: 760 }, width: 300, height: 120 }] } }, context) as { ok: boolean; boardVersion: number }
    expect(response.ok).toBe(true)
    expect(response.boardVersion).toBe(4)
    expect(work.getSnapshot().layoutProposals[0].status).toBe('pending')
    expect(work.getSnapshot().boardItems).toHaveLength(7)

    const preview = registered.find((tool) => tool.name === 'preview_board_layout')!
    const previewed = await preview.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', proposalId: 'draft-severe' }, context) as { ok: boolean; data: { projectedItems: Array<{ id: string }> }; ui: { updated: boolean } }
    expect(previewed.data.projectedItems).toHaveLength(4)
    expect(previewed.ui.updated).toBe(true)
    expect(previewLayoutProposal).toHaveBeenCalledWith('draft-severe')
    expect(openReview).toHaveBeenCalled()

    const requestApply = registered.find((tool) => tool.name === 'apply_board_layout')!
    const requested = await requestApply.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', proposalId: 'draft-severe' }, context) as { ok: boolean; boardVersion: number; data: { requiresDesignerApproval: boolean } }
    expect(requested).toMatchObject({ ok: true, boardVersion: 4, data: { requiresDesignerApproval: true } })
    expect(work.getSnapshot().boardItems).toHaveLength(7)
    const approved = work.dispatch({ type: 'review-board-layout', campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedVersion: 4, idempotencyKey: 'designer-apply-draft', actor: 'designer', proposalId: 'draft-severe', decision: 'approve' })
    expect(approved.ok).toBe(true)
    expect(work.getSnapshot().boardItems.find((item) => item.id === 'note-severe')).toMatchObject({ kind: 'note', noteTone: 'ruby' })
    expect(work.getSnapshot().boardItems.find((item) => item.id === 'campaign-proof-static-bloom')?.locked).toBe(true)
  })

  it('organizes one route through an immutable proposal, ghost preview, and explainable hierarchy', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const work = runtime()
    const previewLayoutProposal = vi.fn()
    const openReview = vi.fn()
    let viewport = { x: 0, y: 0, scale: 1 }
    await registerIterumTools(work, new AbortController(), { getViewport: () => viewport, getViewportSize: () => ({ width: 900, height: 700 }), setViewport: (next) => { viewport = next } }, { previewLayoutProposal, openReview })
    const context = { signal: new AbortController().signal }
    const getStructure = registered.find((tool) => tool.name === 'get_board_structure')!
    const initialStructure = await getStructure.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom' }, context) as { data: { routes: unknown[]; groups: unknown[] } }
    expect(initialStructure.data.routes).toHaveLength(3)
    expect(initialStructure.data.groups).toHaveLength(0)

    const propose = registered.find((tool) => tool.name === 'propose_board_organization')!
    const proposed = await propose.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'organize-type-route', organization: { id: 'organization-tool', title: 'Type pressure hierarchy', scope: { type: 'route', routeId: 'route-synthetic' }, strategy: 'type', layout: 'cluster-grid', maximumGroups: 3, ranking: 'visual-weight', briefKeywords: ['severe', 'warm'] } }, context) as { ok: boolean; boardVersion: number; data: { proposalId: string; groups: Array<{ id: string }>; untouchedLockedItemIds: string[]; requiresDesignerApproval: boolean } }
    expect(proposed).toMatchObject({ ok: true, boardVersion: 4, data: { proposalId: 'organization-tool', untouchedLockedItemIds: ['reference-type-study'], requiresDesignerApproval: true } })
    expect(proposed.data.groups).toHaveLength(1)
    expect(work.getSnapshot().boardItems.every((item) => !item.hierarchyRole)).toBe(true)
    expect(registered.some((tool) => tool.name === 'approve_board_organization')).toBe(false)

    const preview = registered.find((tool) => tool.name === 'preview_board_organization')!
    const previewed = await preview.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', proposalId: 'organization-tool' }, context) as { ok: boolean; boardVersion: number; data: { assignments: Array<{ role: string }>; projectedItems: unknown[] }; ui: { updated: boolean } }
    expect(previewed.ok).toBe(true)
    expect(previewed.boardVersion).toBe(4)
    expect(previewed.data.assignments.map((assignment) => assignment.role)).toEqual(['hero', 'primary'])
    expect(previewed.data.projectedItems).toHaveLength(2)
    expect(previewed.ui.updated).toBe(true)
    expect(previewLayoutProposal).toHaveBeenCalledWith('organization-tool')
    expect(openReview).toHaveBeenCalled()
    expect(viewport.scale).not.toBe(1)

    const explain = registered.find((tool) => tool.name === 'explain_board_group')!
    const explained = await explain.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', proposalId: 'organization-tool', groupId: proposed.data.groups[0].id }, context) as { ok: boolean; data: { assignments: Array<{ itemTitle: string; role: string }> } }
    expect(explained.ok).toBe(true)
    expect(explained.data.assignments).toEqual(expect.arrayContaining([expect.objectContaining({ itemTitle: 'Headline type specimen', role: 'hero' })]))
  })

  it('routes an agent web clip through the pending Review Tray', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const work = runtime()
    await registerIterumTools(work)
    const webClip = registered.find((tool) => tool.name === 'propose_web_clip')!
    const response = await webClip.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'agent-web-clip', clip: { id: 'material-1', title: 'Mineral foil', sourceUrl: 'https://example.com/material', imageUrl: 'https://images.example.com/material.jpg' } }, { signal: new AbortController().signal }) as { ok: boolean }
    expect(response.ok).toBe(true)
    expect(work.getSnapshot().proposals[0]).toMatchObject({ id: 'web-clip-material-1', status: 'pending', captureProvider: 'web-clipper', rightsStatus: 'uncertain', sourceUrl: 'https://example.com/material' })
    expect(work.getSnapshot().boardItems).toHaveLength(7)
  })

  it('exposes the brief lock boundary and proposes routes without approving them', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const work = createWorkspaceRuntime({ ...createDemoWorkspaceState(), creativeRoutes: [] })
    await registerIterumTools(work)
    const lockRequest = registered.find((tool) => tool.name === 'request_campaign_brief_lock')!
    const status = await lockRequest.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom' }, { signal: new AbortController().signal }) as { data: { briefStatus: string; requiresDesignerApproval: boolean } }
    expect(status.data).toEqual({ briefStatus: 'locked', requiresDesignerApproval: false })
    const propose = registered.find((tool) => tool.name === 'propose_creative_routes')!
    const response = await propose.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'tool-route', routes: [{ id: 'route-tool', name: 'Signal bloom', thesis: 'A tense route.', territory: 'Signal', palette: ['#171717', '#4779B8'], typography: 'Compressed display.', imageTreatment: 'Hard reflected light.', compositionPrinciples: ['One focal signal'], frame: { position: { x: 20, y: 20 }, width: 300, height: 600 } }] }, { signal: new AbortController().signal }) as { ok: boolean }
    expect(response.ok).toBe(true)
    expect(work.getSnapshot().creativeRoutes.at(-1)).toMatchObject({ id: 'route-tool', status: 'pending' })
  })

  it('rejects strict malformed, private, and designer-only tool input without mutation', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const work = runtime()
    await registerIterumTools(work)
    const capture = registered.find((tool) => tool.name === 'capture_url_reference')!
    const privateCapture = await capture.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', url: 'http://127.0.0.1/private' }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(privateCapture.error?.code).toBe('VALIDATION_ERROR')
    const isolate = registered.find((tool) => tool.name === 'isolate_reference_background')!
    const invalidIsolation = await isolate.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', sourceType: 'proposal', referenceId: 'proposal-resin', sensitivity: 101 }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(invalidIsolation.error?.code).toBe('VALIDATION_ERROR')
    const capturedProposal = registered.find((tool) => tool.name === 'propose_captured_reference')!
    const invalidCrop = await capturedProposal.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'bad-crop', reference: { id: 'captured', title: 'Captured', sourceUrl: 'https://example.com/reference', attribution: 'Example', rightsStatus: 'uncertain', rationale: 'Capture test', intendedTerritory: 'Material tension', captureProvider: 'microlink', crop: { x: 90, y: 0, width: 20, height: 100 } } }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(invalidCrop.error?.code).toBe('VALIDATION_ERROR')
    const tagProposal = registered.find((tool) => tool.name === 'propose_reference_tags')!
    const invalidTags = await tagProposal.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'bad-tags', targetType: 'proposal', referenceId: 'proposal-resin', suggestionId: 'bad', tags: [], rationale: 'Empty tags.' }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(invalidTags.error?.code).toBe('VALIDATION_ERROR')
    const typeDirection = registered.find((tool) => tool.name === 'propose_type_direction')!
    const invalidType = await typeDirection.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'bad-type', direction: { id: 'type-1', specimenText: 'The air remembers.', rationale: 'Missing the actual faces.' } }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(invalidType.error?.code).toBe('VALIDATION_ERROR')
    const webClip = registered.find((tool) => tool.name === 'propose_web_clip')!
    const privateWebClip = await webClip.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'private-clip', clip: { id: 'private', title: 'Private clip', sourceUrl: 'http://127.0.0.1/private' } }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(privateWebClip.error?.code).toBe('VALIDATION_ERROR')
    const extract = registered.find((tool) => tool.name === 'extract_reference_palette')!
    const malformedExtraction = await extract.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', referenceId: 'reference-iris', crop: 'diagonal' }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(malformedExtraction.error?.code).toBe('VALIDATION_ERROR')
    const scheme = registered.find((tool) => tool.name === 'suggest_color_scheme')!
    const malformedScheme = await scheme.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', hex: 'blue', mode: 'triad' }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(malformedScheme.error?.code).toBe('VALIDATION_ERROR')
    const propose = registered.find((tool) => tool.name === 'propose_reference')!
    const privateUrl = await propose.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'private', proposal: { id: 'private', title: 'Private', sourceUrl: 'http://127.0.0.1/a', attribution: 'x', rightsStatus: 'uncertain', rationale: 'x', intendedTerritory: 'x' } }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(privateUrl.error?.code).toBe('VALIDATION_ERROR')
    const negativeVersion = await propose.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: -1, idempotencyKey: 'negative-version', proposal: { id: 'negative', title: 'Negative version', sourceUrl: 'https://example.com/a', attribution: 'x', rightsStatus: 'uncertain', rationale: 'x', intendedTerritory: 'x' } }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(negativeVersion.error?.code).toBe('VALIDATION_ERROR')
    expect(work.getSnapshot().version).toBe(3)
    const reject = registered.find((tool) => tool.name === 'reject_reference')!
    const decision = await reject.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'reject', proposalId: 'proposal-resin' }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(decision.error?.code).toBe('DESIGNER_REVIEW_REQUIRED')
    expect(work.getSnapshot().version).toBe(3)
  })

  it('aborts the exact registration signal when the lifecycle unmounts', async () => {
    const signals: AbortSignal[] = []
    document.modelContext = { registerTool: vi.fn(async (_tool, options) => { signals.push(options?.signal!); return undefined }) }
    const work = runtime()
    function Harness() { useWebMcpTools(work); return null }
    const mounted = render(createElement(Harness))
    await vi.waitFor(() => expect(signals).toHaveLength(40))
    mounted.unmount()
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })
})
