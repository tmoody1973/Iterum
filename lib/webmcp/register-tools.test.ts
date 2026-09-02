import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { createElement } from 'react'

import { createDemoWorkspaceState } from '../domain/demo-data'
import { createWorkspaceRuntime } from '../domain/workspace-runtime'
import { registerIterumTools } from './register-tools'
import { useWebMcpTools } from '../../hooks/use-webmcp-tools'

const runtime = () => createWorkspaceRuntime(createDemoWorkspaceState())

afterEach(() => { delete document.modelContext })

describe('registerIterumTools', () => {
  it('falls back without a browser API', async () => expect(await registerIterumTools(runtime())).toBeNull())

  it('registers twenty-one strict tools sequentially and returns versioned errors and receipts', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown; inputSchema: Record<string, unknown>; annotations?: { untrustedContentHint?: boolean } }> = []
    const signals: AbortSignal[] = []
    document.modelContext = { registerTool: vi.fn(async (tool, options) => { registered.push(tool); signals.push(options?.signal!); return undefined }) }
    const work = runtime()
    const result = await registerIterumTools(work)
    expect(result?.count).toBe(21)
    expect(registered.map((tool) => tool.name)).toEqual(['get_campaign_context', 'get_board_viewport', 'focus_board_items', 'set_board_viewport', 'reset_board_viewport', 'search_reference_library', 'capture_url_reference', 'search_reference_images', 'search_typefaces', 'isolate_reference_background', 'extract_reference_palette', 'suggest_color_scheme', 'suggest_experimental_palette', 'propose_captured_reference', 'propose_web_clip', 'propose_reference_tags', 'propose_type_direction', 'propose_reference', 'approve_reference', 'reject_reference', 'undo_action'])
    expect(registered.every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true)
    expect(signals).toHaveLength(21)
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

  it('routes an agent web clip through the pending Review Tray', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const work = runtime()
    await registerIterumTools(work)
    const webClip = registered.find((tool) => tool.name === 'propose_web_clip')!
    const response = await webClip.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'agent-web-clip', clip: { id: 'material-1', title: 'Mineral foil', sourceUrl: 'https://example.com/material', imageUrl: 'https://images.example.com/material.jpg' } }, { signal: new AbortController().signal }) as { ok: boolean }
    expect(response.ok).toBe(true)
    expect(work.getSnapshot().proposals[0]).toMatchObject({ id: 'web-clip-material-1', status: 'pending', captureProvider: 'web-clipper', rightsStatus: 'uncertain', sourceUrl: 'https://example.com/material' })
    expect(work.getSnapshot().boardItems).toHaveLength(5)
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
    await vi.waitFor(() => expect(signals).toHaveLength(21))
    mounted.unmount()
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })
})
