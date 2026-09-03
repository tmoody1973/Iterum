import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'

import { internalMutation, internalQuery } from './_generated/server'

async function ownedProject(ctx: Parameters<typeof getAuthUserId>[0], projectKey: string) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'Open a private designer session before generating images.' })
  const project = await (ctx as typeof ctx & { db: any }).db.query('projects').withIndex('by_project_key', (q: any) => q.eq('projectKey', projectKey)).unique()
  if (!project) throw new ConvexError({ code: 'PROJECT_NOT_FOUND', message: 'The project no longer exists.' })
  if (project.ownerId !== userId) throw new ConvexError({ code: 'FORBIDDEN', message: 'This project belongs to another designer.' })
  return project
}

export const beginRun = internalMutation({
  args: {
    projectKey: v.string(), runKey: v.string(), idempotencyKey: v.string(), requestHash: v.string(), boardVersionBefore: v.number(),
    operation: v.union(v.literal('generate-candidates'), v.literal('edit-candidate'), v.literal('generate-applications')),
    territoryId: v.string(), purpose: v.string(), prompt: v.string(), preserve: v.array(v.string()), avoid: v.array(v.string()),
    quality: v.union(v.literal('low'), v.literal('medium'), v.literal('high')), referenceItemIds: v.array(v.string()), outputSpecs: v.any(), costQuote: v.any(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const project = await ownedProject(ctx, args.projectKey)
    if (project.workspaceVersion !== args.boardVersionBefore) throw new ConvexError({ code: 'BOARD_VERSION_CONFLICT', message: 'Save the current board before starting generation.', expected: args.boardVersionBefore, actual: project.workspaceVersion })
    const workspace = project.workspace as { creativeRoutes?: Array<{ id?: string; status?: string }>; boardItems?: Array<{ id?: string; imageUrl?: string }> }
    if (!workspace.creativeRoutes?.some((route) => route.id === args.territoryId && route.status === 'approved')) throw new ConvexError({ code: 'CREATIVE_ROUTE_NOT_APPROVED', message: 'Only an approved creative route can drive image generation.' })
    if (args.operation !== 'edit-candidate') {
      const approvedImageIds = new Set((workspace.boardItems ?? []).filter((item) => typeof item.imageUrl === 'string').map((item) => item.id))
      if (args.referenceItemIds.some((itemId) => !approvedImageIds.has(itemId))) throw new ConvexError({ code: 'REFERENCE_NOT_APPROVED', message: 'Generation references must already be approved board items.' })
    } else if (!args.referenceItemIds.length) {
      throw new ConvexError({ code: 'PARENT_ASSET_NOT_FOUND', message: 'An edit requires an existing generated asset.' })
    }
    const existing = await ctx.db.query('imageGenerationRuns').withIndex('by_project_and_idempotency', (q) => q.eq('projectId', project._id).eq('idempotencyKey', args.idempotencyKey)).unique()
    if (existing) {
      if (existing.requestHash !== args.requestHash) throw new ConvexError({ code: 'IDEMPOTENCY_CONFLICT', message: 'That idempotency key was already used for a different generation request.' })
      return { duplicate: true, run: { ...existing, runKey: existing.runKey } }
    }
    const createdAt = Date.now()
    const runId = await ctx.db.insert('imageGenerationRuns', {
      projectId: project._id, runKey: args.runKey, idempotencyKey: args.idempotencyKey, requestHash: args.requestHash,
      operation: args.operation, status: 'running', model: 'gpt-image-2', quality: args.quality, territoryId: args.territoryId,
      purpose: args.purpose, prompt: args.prompt, preserve: args.preserve, avoid: args.avoid, referenceItemIds: args.referenceItemIds,
      outputSpecs: args.outputSpecs, costQuote: args.costQuote, boardVersionBefore: args.boardVersionBefore,
      proposalIds: [], outputs: [], createdAt,
    })
    return { duplicate: false, runId, projectId: project._id, createdAt }
  },
})

const storedOutput = v.object({
  assetKey: v.string(), parentAssetKey: v.optional(v.string()), label: v.string(), storageId: v.id('_storage'), imageUrl: v.string(),
  mediaType: v.literal('image/webp'), width: v.number(), height: v.number(), purpose: v.string(),
  applicationFormat: v.optional(v.union(v.literal('poster-4:5'), v.literal('story-9:16'), v.literal('landing-hero-16:9'), v.literal('square-1:1'))),
  model: v.literal('gpt-image-2'), prompt: v.string(), referenceItemIds: v.array(v.string()), createdAt: v.number(),
})

export const completeRun = internalMutation({
  args: { projectKey: v.string(), runId: v.id('imageGenerationRuns'), requestId: v.optional(v.string()), outputs: v.array(storedOutput) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const project = await ownedProject(ctx, args.projectKey)
    const run = await ctx.db.get(args.runId)
    if (!run || run.projectId !== project._id) throw new ConvexError({ code: 'RUN_NOT_FOUND', message: 'The image generation run no longer exists.' })
    if (run.status !== 'running') return run
    const outputs = []
    for (const output of args.outputs) {
      let version = 1
      if (output.parentAssetKey) {
        const parent = await ctx.db.query('generatedImageAssets').withIndex('by_project_and_asset_key', (q) => q.eq('projectId', project._id).eq('assetKey', output.parentAssetKey!)).unique()
        if (!parent) throw new ConvexError({ code: 'PARENT_ASSET_NOT_FOUND', message: 'The candidate being edited is no longer available.' })
        version = parent.version + 1
      }
      const publicOutput = { ...output, version, runKey: run.runKey }
      await ctx.db.insert('generatedImageAssets', { projectId: project._id, runId: run._id, ...output, version })
      outputs.push(publicOutput)
    }
    const completedAt = Date.now()
    await ctx.db.patch(run._id, { status: 'generated', outputs, requestId: args.requestId, completedAt })
    return { ...run, status: 'generated', outputs, requestId: args.requestId, completedAt }
  },
})

export const failRun = internalMutation({
  args: { projectKey: v.string(), runId: v.id('imageGenerationRuns'), requestId: v.optional(v.string()), error: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const project = await ownedProject(ctx, args.projectKey)
    const run = await ctx.db.get(args.runId)
    if (run && run.projectId === project._id) await ctx.db.patch(run._id, { status: 'failed', requestId: args.requestId, error: args.error, completedAt: Date.now() })
    return null
  },
})

export const getRunContext = internalQuery({
  args: { projectKey: v.string(), runKey: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const project = await ownedProject(ctx, args.projectKey)
    return await ctx.db.query('imageGenerationRuns').withIndex('by_project_and_run_key', (q) => q.eq('projectId', project._id).eq('runKey', args.runKey)).unique()
  },
})
