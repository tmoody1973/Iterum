import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'

import { internal } from './_generated/api'
import { action, mutation, query } from './_generated/server'

const outputSpec = v.object({
  label: v.string(), aspectRatio: v.union(v.literal('1:1'), v.literal('4:5'), v.literal('5:4'), v.literal('9:16'), v.literal('16:9')),
  size: v.string(), count: v.number(),
  applicationFormat: v.optional(v.union(v.literal('poster-4:5'), v.literal('story-9:16'), v.literal('landing-hero-16:9'), v.literal('square-1:1'))),
})

function dimensions(size: string) {
  const [width, height] = size.split('x').map(Number)
  if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error('INVALID_IMAGE_SIZE')
  return { width, height }
}

function decodeBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function fetchImage(url: string, index: number) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`REFERENCE_FETCH_FAILED:${response.status}`)
  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) throw new Error('REFERENCE_NOT_IMAGE')
  if (blob.size > 50 * 1024 * 1024) throw new Error('REFERENCE_TOO_LARGE')
  const extension = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
  return { blob, filename: `iterum-reference-${index + 1}.${extension}` }
}

async function callOpenAI(apiKey: string, prompt: string, quality: string, spec: { size: string; count: number }, referenceUrls: string[], maskImageUrl?: string) {
  let response: Response
  if (referenceUrls.length) {
    const form = new FormData()
    form.append('model', 'gpt-image-2'); form.append('prompt', prompt); form.append('quality', quality); form.append('size', spec.size); form.append('n', String(spec.count)); form.append('output_format', 'webp')
    const images = await Promise.all(referenceUrls.map(fetchImage))
    images.forEach(({ blob, filename }) => form.append('image[]', blob, filename))
    if (maskImageUrl) { const mask = await fetchImage(maskImageUrl, 99); form.append('mask', mask.blob, mask.filename) }
    response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form })
  } else {
    response = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-image-2', prompt, quality, size: spec.size, n: spec.count, output_format: 'webp' }) })
  }
  const requestId = response.headers.get('x-request-id') ?? undefined
  const payload = await response.json() as { data?: Array<{ b64_json?: string }>; error?: { code?: string; message?: string; type?: string } }
  if (!response.ok || !payload.data?.length) {
    const code = payload.error?.code ?? `OPENAI_HTTP_${response.status}`
    const error = new Error(payload.error?.message ?? 'OpenAI returned no image.') as Error & { code?: string; requestId?: string; retryable?: boolean }
    error.code = code; error.requestId = requestId; error.retryable = response.status === 429 || response.status >= 500
    throw error
  }
  return { images: payload.data.map((entry) => entry.b64_json).filter((value): value is string => Boolean(value)), requestId }
}

export const execute = action({
  args: {
    projectKey: v.string(), runKey: v.string(), idempotencyKey: v.string(), requestHash: v.string(), boardVersionBefore: v.number(),
    operation: v.union(v.literal('generate-candidates'), v.literal('edit-candidate'), v.literal('generate-applications')),
    territoryId: v.string(), purpose: v.string(), prompt: v.string(), preserve: v.array(v.string()), avoid: v.array(v.string()),
    quality: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    references: v.array(v.object({ itemId: v.string(), title: v.string(), imageUrl: v.string() })), outputSpecs: v.array(outputSpec),
    parentAssetKey: v.optional(v.string()), maskImageUrl: v.optional(v.string()), costQuote: v.any(),
    costApproval: v.object({ accepted: v.literal(true), quoteFingerprint: v.string() }),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    if (!(await getAuthUserId(ctx))) throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'Open a private designer session before generating images.' })
    const totalImages = args.outputSpecs.reduce((total, spec) => total + spec.count, 0)
    const outputRate = { low: 0.006, medium: 0.053, high: 0.211 }[args.quality]
    const expectedOutputUsd = Number((outputRate * totalImages).toFixed(3))
    if (totalImages < 1 || totalImages > 4 || args.outputSpecs.some((spec) => !Number.isInteger(spec.count) || spec.count < 1 || spec.count > 4) || args.references.length > 8) throw new ConvexError({ code: 'INVALID_GENERATION_REQUEST', message: 'A run may create 1–4 images from at most eight references.' })
    if (args.costApproval.quoteFingerprint !== args.costQuote?.quoteFingerprint || args.costQuote?.model !== 'gpt-image-2' || args.costQuote?.quality !== args.quality || args.costQuote?.imageCount !== totalImages || args.costQuote?.estimatedOutputUsd !== expectedOutputUsd) throw new ConvexError({ code: 'COST_APPROVAL_REQUIRED', message: 'The approved quote does not match this generation request.' })
    const started: any = await ctx.runMutation(internal.imageGenerationInternal.beginRun, {
      projectKey: args.projectKey, runKey: args.runKey, idempotencyKey: args.idempotencyKey, requestHash: args.requestHash,
      boardVersionBefore: args.boardVersionBefore, operation: args.operation, territoryId: args.territoryId, purpose: args.purpose,
      prompt: args.prompt, preserve: args.preserve, avoid: args.avoid, quality: args.quality,
      referenceItemIds: args.references.map((reference) => reference.itemId), outputSpecs: args.outputSpecs, costQuote: args.costQuote,
    })
    if (started.duplicate) {
      if (started.run.status === 'running') throw new ConvexError({ code: 'RUN_IN_PROGRESS', message: 'This image generation request is already running.' })
      return started.run
    }
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      const error = { code: 'PROVIDER_NOT_CONFIGURED', message: 'OPENAI_API_KEY is not configured in the Convex deployment.', retryable: false }
      await ctx.runMutation(internal.imageGenerationInternal.failRun, { projectKey: args.projectKey, runId: started.runId, error })
      throw new ConvexError(error)
    }
    let requestId: string | undefined
    try {
      const storedOutputs = []
      for (let specIndex = 0; specIndex < args.outputSpecs.length; specIndex += 1) {
        const spec = args.outputSpecs[specIndex]
        const generated = await callOpenAI(apiKey, args.prompt, args.quality, spec, args.references.map((reference) => reference.imageUrl), args.maskImageUrl)
        requestId = generated.requestId ?? requestId
        const { width, height } = dimensions(spec.size)
        for (let imageIndex = 0; imageIndex < generated.images.length; imageIndex += 1) {
          const assetKey = `${args.runKey}-${specIndex + 1}-${imageIndex + 1}`
          const blob = new Blob([decodeBase64(generated.images[imageIndex])], { type: 'image/webp' })
          const storageId = await ctx.storage.store(blob)
          const imageUrl = await ctx.storage.getUrl(storageId)
          if (!imageUrl) throw new Error('STORAGE_URL_UNAVAILABLE')
          storedOutputs.push({ assetKey, ...(args.parentAssetKey ? { parentAssetKey: args.parentAssetKey } : {}), label: spec.count > 1 ? `${spec.label} ${imageIndex + 1}` : spec.label, storageId, imageUrl, mediaType: 'image/webp' as const, width, height, purpose: args.purpose, ...(spec.applicationFormat ? { applicationFormat: spec.applicationFormat } : {}), model: 'gpt-image-2' as const, prompt: args.prompt, referenceItemIds: args.references.map((reference) => reference.itemId), createdAt: Date.now() })
        }
      }
      if (!storedOutputs.length) throw new Error('NO_IMAGES_RETURNED')
      return await ctx.runMutation(internal.imageGenerationInternal.completeRun, { projectKey: args.projectKey, runId: started.runId, requestId, outputs: storedOutputs })
    } catch (caught) {
      const error = caught as Error & { code?: string; requestId?: string; retryable?: boolean }
      const ledgerError = { code: error.code ?? error.message.split(':')[0] ?? 'IMAGE_GENERATION_FAILED', message: error.message, retryable: error.retryable ?? false }
      await ctx.runMutation(internal.imageGenerationInternal.failRun, { projectKey: args.projectKey, runId: started.runId, requestId: error.requestId ?? requestId, error: ledgerError })
      throw new ConvexError(ledgerError)
    }
  },
})

export const markAwaitingReview = mutation({
  args: { projectKey: v.string(), runKey: v.string(), proposalIds: v.array(v.string()), boardVersionAfter: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'Open a private designer session.' })
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    if (!project || project.ownerId !== userId) throw new ConvexError({ code: 'PROJECT_NOT_FOUND', message: 'The project is unavailable.' })
    const run = await ctx.db.query('imageGenerationRuns').withIndex('by_project_and_run_key', (q) => q.eq('projectId', project._id).eq('runKey', args.runKey)).unique()
    if (!run) throw new ConvexError({ code: 'RUN_NOT_FOUND', message: 'The image generation run no longer exists.' })
    await ctx.db.patch(run._id, { status: 'awaiting-review', proposalIds: args.proposalIds, boardVersionAfter: args.boardVersionAfter })
    return { ...run, status: 'awaiting-review', proposalIds: args.proposalIds, boardVersionAfter: args.boardVersionAfter }
  },
})

export const getRun = query({
  args: { projectKey: v.string(), runKey: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'Open a private designer session.' })
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    if (!project || project.ownerId !== userId) return null
    return await ctx.db.query('imageGenerationRuns').withIndex('by_project_and_run_key', (q) => q.eq('projectId', project._id).eq('runKey', args.runKey)).unique()
  },
})
