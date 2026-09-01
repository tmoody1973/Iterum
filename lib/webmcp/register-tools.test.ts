import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDemoWorkspaceState } from '../domain/demo-data'
import { createWorkspaceRuntime } from '../domain/workspace-runtime'
import { registerIterumTools } from './register-tools'

const runtime = () => createWorkspaceRuntime(createDemoWorkspaceState())

afterEach(() => { delete document.modelContext })

describe('registerIterumTools', () => {
  it('falls back without a browser API', async () => expect(await registerIterumTools(runtime())).toBeNull())

  it('registers five strict tools sequentially and returns versioned errors and receipts', async () => {
    const registered: Array<{ name: string; execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> | unknown; inputSchema: Record<string, unknown> }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const work = runtime()
    const result = await registerIterumTools(work)
    expect(result?.count).toBe(5)
    expect(registered.map((tool) => tool.name)).toEqual(['get_campaign_context', 'propose_reference', 'approve_reference', 'reject_reference', 'undo_action'])
    expect(registered.every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true)
    const approve = registered.find((tool) => tool.name === 'approve_reference')!
    const stale = await approve.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 999, idempotencyKey: 'stale', proposalId: 'proposal-resin' }, { signal: new AbortController().signal }) as { ok: boolean; error?: { code: string } }
    expect(stale).toMatchObject({ ok: false, error: { code: 'VERSION_CONFLICT' } })
    const receipt = await approve.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'approve', proposalId: 'proposal-resin' }, { signal: new AbortController().signal }) as { ok: boolean; receipt?: { id: string } }
    expect(receipt.ok).toBe(true)
    expect(receipt.receipt?.id).toBeTruthy()
    result?.controller.abort()
    expect(result?.controller.signal.aborted).toBe(true)
  })
})
