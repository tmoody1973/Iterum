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

  it('registers five strict tools sequentially and returns versioned errors and receipts', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown; inputSchema: Record<string, unknown>; annotations?: { untrustedContentHint?: boolean } }> = []
    const signals: AbortSignal[] = []
    document.modelContext = { registerTool: vi.fn(async (tool, options) => { registered.push(tool); signals.push(options?.signal!); return undefined }) }
    const work = runtime()
    const result = await registerIterumTools(work)
    expect(result?.count).toBe(5)
    expect(registered.map((tool) => tool.name)).toEqual(['get_campaign_context', 'propose_reference', 'approve_reference', 'reject_reference', 'undo_action'])
    expect(registered.every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true)
    expect(signals).toHaveLength(5)
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

  it('rejects strict malformed, private, and designer-only tool input without mutation', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const work = runtime()
    await registerIterumTools(work)
    const propose = registered.find((tool) => tool.name === 'propose_reference')!
    const privateUrl = await propose.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'private', proposal: { id: 'private', title: 'Private', sourceUrl: 'http://127.0.0.1/a', attribution: 'x', rightsStatus: 'uncertain', rationale: 'x', intendedTerritory: 'x' } }, { signal: new AbortController().signal }) as { error?: { code: string } }
    expect(privateUrl.error?.code).toBe('VALIDATION_ERROR')
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
    await vi.waitFor(() => expect(signals).toHaveLength(5))
    mounted.unmount()
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })
})
