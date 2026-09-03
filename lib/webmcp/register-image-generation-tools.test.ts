import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFullCampaignDemoState } from '../domain/full-campaign-demo-data'
import { createWorkspaceRuntime } from '../domain/workspace-runtime'
import type { ImageGenerationController, ImageGenerationRun } from '../image-generation/types'
import type { ProjectController } from '../persistence/project-controller'
import { createImageGenerationTools } from './register-image-generation-tools'
import { registerIterumTools } from './register-tools'

function runFor(input: Parameters<ImageGenerationController['execute']>[0]): ImageGenerationRun {
  const outputs = input.outputSpecs.flatMap((spec, specIndex) => Array.from({ length: spec.count }, (_, imageIndex) => ({
    assetKey: `${input.runKey}-${specIndex + 1}-${imageIndex + 1}`, runKey: input.runKey, parentAssetKey: input.parentAssetKey,
    version: input.parentAssetKey ? 2 : 1, label: spec.count > 1 ? `${spec.label} ${imageIndex + 1}` : spec.label,
    imageUrl: `https://images.example.test/${input.runKey}-${specIndex}-${imageIndex}.webp`, mediaType: 'image/webp' as const,
    width: Number(spec.size.split('x')[0]), height: Number(spec.size.split('x')[1]), purpose: input.purpose,
    applicationFormat: spec.applicationFormat, model: 'gpt-image-2' as const, prompt: input.prompt,
    referenceItemIds: input.references.map((reference) => reference.itemId), createdAt: 100,
  })))
  return { ...input, referenceItemIds: input.references.map((reference) => reference.itemId), model: 'gpt-image-2', status: 'generated', proposalIds: [], outputs, createdAt: 90 }
}

function setup() {
  const runtime = createWorkspaceRuntime(createFullCampaignDemoState())
  const runs = new Map<string, ImageGenerationRun>()
  const imageGeneration: ImageGenerationController = {
    execute: vi.fn(async (input) => { const run = runFor(input); runs.set(run.runKey, run); return run }),
    markAwaitingReview: vi.fn(async (runKey, proposalIds, boardVersionAfter) => {
      const run = runs.get(runKey)!
      const updated = { ...run, status: 'awaiting-review' as const, proposalIds, boardVersionAfter }
      runs.set(runKey, updated)
      return updated
    }),
    getRun: vi.fn(async (runKey) => runs.get(runKey) ?? null),
  }
  const openReview = vi.fn()
  const tools = createImageGenerationTools(runtime, { imageGeneration } as ProjectController, { openReview })
  return { runtime, imageGeneration, openReview, tools }
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => { delete document.modelContext })

describe('image generation WebMCP tools', () => {
  it('registers all four tools on a cloud project workspace', async () => {
    const { runtime, imageGeneration } = setup()
    const names: string[] = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { names.push(tool.name); return undefined }) }
    const registered = await registerIterumTools(runtime, new AbortController(), undefined, undefined, undefined, { imageGeneration } as ProjectController)
    expect(registered?.count).toBe(51)
    expect(names).toEqual(expect.arrayContaining(['generate_image_candidates', 'edit_image_candidate', 'generate_campaign_applications', 'get_image_generation_run']))
  })

  it('requires a visible cost quote before generating and sends every result to Review', async () => {
    const { runtime, imageGeneration, openReview, tools } = setup()
    const tool = tools.find((entry) => entry.name === 'generate_image_candidates')!
    const request = {
      campaignId: 'campaign-pivot-one', boardId: 'board-pivot-one', expectedBoardVersion: 18, idempotencyKey: 'image-study-1',
      territoryId: 'route-modular-signal', purpose: 'campaign-image', referenceItemIds: ['reference-pivot-product', 'reference-perforated-rhythm'],
      prompt: 'Hard daylight product still life with a single red interruption.', preserve: ['cobalt product geometry'], avoid: ['domestic setting'],
      aspectRatio: '4:5', quality: 'medium', candidateCount: 2,
    }
    const quote = await tool.execute(request, { signal: new AbortController().signal }) as any
    expect(quote).toMatchObject({ ok: true, boardVersion: 18, data: { generationStarted: false, quote: { imageCount: 2, estimatedOutputUsd: 0.106, requiresCostApproval: true } } })
    expect(imageGeneration.execute).not.toHaveBeenCalled()

    const generated = await tool.execute({ ...request, costApproval: { accepted: true, quoteFingerprint: quote.data.quote.quoteFingerprint } }, { signal: new AbortController().signal }) as any
    expect(generated).toMatchObject({ ok: true, boardVersion: 20, data: { requiresDesignerApproval: true } })
    expect(runtime.getSnapshot().proposals.filter((proposal) => proposal.generation?.origin === 'generated')).toHaveLength(2)
    expect(runtime.getSnapshot().boardItems).toHaveLength(8)
    expect(imageGeneration.execute).toHaveBeenCalledWith(expect.objectContaining({ operation: 'generate-candidates', references: expect.arrayContaining([expect.objectContaining({ itemId: 'reference-pivot-product' })]) }))
    expect((imageGeneration.execute as ReturnType<typeof vi.fn>).mock.calls[0][0].prompt).toContain('Do not render logos')
    expect(imageGeneration.markAwaitingReview).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([expect.stringMatching(/^generated-/)]), 20)
    expect(openReview).toHaveBeenCalled()
  })

  it('keeps campaign applications behind approved route and board-asset boundaries', async () => {
    const { runtime, tools } = setup()
    const tool = tools.find((entry) => entry.name === 'generate_campaign_applications')!
    const base = { campaignId: 'campaign-pivot-one', boardId: 'board-pivot-one', expectedBoardVersion: 18, idempotencyKey: 'apps-1', sourceItemId: 'reference-pivot-product', referenceItemIds: [], formats: ['poster-4:5'], prompt: 'Translate the approved image system.', preserve: ['product geometry'], avoid: ['raster typography'], quality: 'low' }
    const blocked = await tool.execute({ ...base, territoryId: 'route-object-theatre' }, { signal: new AbortController().signal }) as any
    expect(blocked).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
    const quote = await tool.execute({ ...base, territoryId: 'route-modular-signal' }, { signal: new AbortController().signal }) as any
    expect(quote).toMatchObject({ ok: true, data: { generationStarted: false, quote: { estimatedOutputUsd: 0.006 } } })
    expect(runtime.getSnapshot().version).toBe(18)
  })

  it('creates immutable candidate edits and reports the run ledger', async () => {
    const { runtime, tools } = setup()
    const lineage = { origin: 'generated' as const, runKey: 'run-original', assetKey: 'asset-original', version: 1, model: 'gpt-image-2' as const, prompt: 'Original', purpose: 'campaign-image', referenceItemIds: ['reference-pivot-product'], width: 1024, height: 1280, createdAt: 1, rasterTextCanonical: false as const }
    runtime.replaceSnapshot({ ...runtime.getSnapshot(), boardItems: [...runtime.getSnapshot().boardItems, { id: 'approved-generated', title: 'Approved generated study', kind: 'agent-addition', imageUrl: 'https://images.example.test/original.webp', sourceUrl: 'https://images.example.test/original.webp', attribution: 'Generated with OpenAI', rightsStatus: 'reference-only', territory: 'Modular signal', position: { x: 0, y: 0 }, width: 200, height: 250, locked: false, generation: lineage }] })
    const edit = tools.find((entry) => entry.name === 'edit_image_candidate')!
    const base = { campaignId: 'campaign-pivot-one', boardId: 'board-pivot-one', expectedBoardVersion: 18, idempotencyKey: 'edit-1', territoryId: 'route-modular-signal', candidateId: 'asset-original', prompt: 'Tighten the shadow edge.', preserve: ['product geometry'], avoid: ['new objects'], aspectRatio: '4:5', quality: 'low' }
    const quote = await edit.execute(base, { signal: new AbortController().signal }) as any
    const edited = await edit.execute({ ...base, costApproval: { accepted: true, quoteFingerprint: quote.data.quote.quoteFingerprint } }, { signal: new AbortController().signal }) as any
    expect(edited).toMatchObject({ ok: true, data: { previousAssetKey: 'asset-original', requiresDesignerApproval: true } })
    const proposal = runtime.getSnapshot().proposals.find((entry) => entry.generation?.parentAssetKey === 'asset-original')!
    expect(proposal.generation).toMatchObject({ version: 2, rasterTextCanonical: false })
    const ledger = tools.find((entry) => entry.name === 'get_image_generation_run')!
    const read = await ledger.execute({ campaignId: 'campaign-pivot-one', boardId: 'board-pivot-one', runKey: proposal.generation!.runKey }, { signal: new AbortController().signal }) as any
    expect(read).toMatchObject({ ok: true, data: { run: { status: 'awaiting-review' }, approvalStates: [{ proposalId: proposal.id, status: 'pending' }] } })
  })
})
