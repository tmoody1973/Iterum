import type { WebMCPTool } from '../../types/webmcp'
import type { WorkspaceRuntime } from '../domain/workspace-runtime'
import type { BoardItem, CropRect, GeneratedImageLineage, Proposal, WorkspaceState } from '../domain/types'
import { IMAGE_SIZE_BY_RATIO, quoteImageGeneration, stableImageFingerprint } from '../image-generation/cost'
import type { CampaignApplicationFormat, ImageAspectRatio, ImageGenerationOutputSpec, ImageGenerationQuality, ImageGenerationRun } from '../image-generation/types'
import type { ProjectController } from '../persistence/project-controller'
import { failure, success } from './types'

type ReviewUi = { openReview(): void }
type Input = Record<string, unknown>

const mutationKeys = ['campaignId', 'boardId', 'expectedBoardVersion', 'idempotencyKey']
const ratios: ImageAspectRatio[] = ['1:1', '4:5', '5:4', '9:16', '16:9']
const qualities: ImageGenerationQuality[] = ['low', 'medium', 'high']
const applicationFormats: CampaignApplicationFormat[] = ['poster-4:5', 'story-9:16', 'landing-hero-16:9', 'square-1:1']
const applicationRatio: Record<CampaignApplicationFormat, ImageAspectRatio> = { 'poster-4:5': '4:5', 'story-9:16': '9:16', 'landing-hero-16:9': '16:9', 'square-1:1': '1:1' }

const isObject = (value: unknown): value is Input => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const exact = (input: Input, allowed: string[]) => Object.keys(input).every((key) => allowed.includes(key))
const stringList = (value: unknown, maximum: number) => Array.isArray(value) && value.length <= maximum && value.every((entry) => typeof entry === 'string' && entry.trim().length > 0 && entry.length <= 160)
const publicImageUrl = (url: string) => /^https:\/\//i.test(url)

function baseInput(state: WorkspaceState, input: unknown, allowed: string[]) {
  if (!isObject(input) || !exact(input, [...mutationKeys, ...allowed])) return null
  if (input.campaignId !== state.campaign.id || input.boardId !== state.campaign.boardId || input.expectedBoardVersion !== state.version || typeof input.idempotencyKey !== 'string' || !input.idempotencyKey || input.idempotencyKey.length > 120) return null
  return input
}

function approvedRoute(state: WorkspaceState, routeId: unknown) {
  return typeof routeId === 'string' ? state.creativeRoutes.find((route) => route.id === routeId && route.status === 'approved') : undefined
}

function absoluteImageUrl(url: string) {
  if (/^https:\/\//i.test(url) || /^data:/i.test(url)) return url
  return new URL(url, window.location.origin).toString()
}

function referencesFor(state: WorkspaceState, itemIds: string[]) {
  const references = itemIds.map((itemId) => state.boardItems.find((item) => item.id === itemId)).filter((item): item is BoardItem => Boolean(item))
  if (references.length !== itemIds.length || references.some((item) => !item.imageUrl)) return null
  return references.map((item) => ({ itemId: item.id, title: item.title, imageUrl: absoluteImageUrl(item.imageUrl!) }))
}

function generatedSource(state: WorkspaceState, candidateId: unknown) {
  if (typeof candidateId !== 'string' || !candidateId) return undefined
  const proposal = state.proposals.find((item) => item.generation?.assetKey === candidateId || item.id === candidateId)
  if (proposal?.generation && proposal.imageUrl) return { title: proposal.title, imageUrl: proposal.imageUrl, generation: proposal.generation }
  const item = state.boardItems.find((entry) => entry.generation?.assetKey === candidateId || entry.id === candidateId)
  if (item?.generation && item.imageUrl) return { title: item.title, imageUrl: item.imageUrl, generation: item.generation }
  return undefined
}

function validApproval(value: unknown, fingerprint: string) {
  return isObject(value) && exact(value, ['accepted', 'quoteFingerprint']) && value.accepted === true && value.quoteFingerprint === fingerprint
}

function generationPrompt(state: WorkspaceState, routeId: string, prompt: string, preserve: string[], avoid: string[], purpose: string, crop?: CropRect) {
  const route = state.creativeRoutes.find((item) => item.id === routeId)!
  return [
    `Campaign: ${state.campaign.name}. Direction: ${route.name}. Thesis: ${route.thesis}.`,
    `Image treatment: ${route.imageTreatment}. Composition: ${route.compositionPrinciples.join('; ')}. Palette: ${route.palette.join(', ')}.`,
    `Purpose: ${purpose}. Creative instruction: ${prompt.trim()}`,
    preserve.length ? `Preserve: ${preserve.join('; ')}.` : '',
    avoid.length ? `Avoid: ${avoid.join('; ')}.` : '',
    crop ? `Concentrate the edit within the normalized crop region x ${crop.x}%, y ${crop.y}%, width ${crop.width}%, height ${crop.height}%.` : '',
    'Generate the image layer only. Do not render logos, labels, captions, interface elements, or legible campaign typography. Leave deliberate type-safe space for the designer.',
  ].filter(Boolean).join('\n')
}

function proposalFromOutput(run: ImageGenerationRun, output: ImageGenerationRun['outputs'][number], territory: string, index: number): Omit<Proposal, 'status'> {
  const generation: GeneratedImageLineage = {
    origin: 'generated', runKey: run.runKey, assetKey: output.assetKey, parentAssetKey: output.parentAssetKey,
    version: output.version, model: output.model, prompt: output.prompt, purpose: output.purpose,
    referenceItemIds: output.referenceItemIds, width: output.width, height: output.height,
    createdAt: output.createdAt, applicationFormat: output.applicationFormat, rasterTextCanonical: false,
  }
  return {
    id: `generated-${output.assetKey}`, title: output.label || `Generated study ${index + 1}`, imageUrl: output.imageUrl,
    sourceUrl: output.imageUrl, attribution: 'Generated with OpenAI GPT Image 2', rightsStatus: 'reference-only',
    rationale: `Generated ${output.purpose} for designer review. The raster output is an image layer, not canonical campaign typography.`,
    intendedTerritory: territory, captureProvider: 'openai-image', tags: ['generated', output.purpose, ...(output.applicationFormat ? [output.applicationFormat] : [])], generation,
  }
}

async function addRunToReview(runtime: WorkspaceRuntime, controller: NonNullable<ProjectController['imageGeneration']>, run: ImageGenerationRun, territory: string, idempotencyKey: string, reviewUi?: ReviewUi) {
  const proposalIds: string[] = []
  run.outputs.forEach((output, index) => {
    const proposal = proposalFromOutput(run, output, territory, index)
    proposalIds.push(proposal.id)
    const current = runtime.getSnapshot()
    if (current.proposals.some((item) => item.id === proposal.id)) return
    const result = runtime.dispatch({ type: 'propose-reference', campaignId: current.campaign.id, boardId: current.campaign.boardId, expectedVersion: current.version, idempotencyKey: `${idempotencyKey}:review:${index}`, actor: 'agent', proposal: { ...proposal, directPlacement: false } })
    if (!result.ok) throw new Error(result.error.message)
  })
  const finalState = runtime.getSnapshot()
  const updated = await controller.markAwaitingReview(run.runKey, proposalIds, finalState.version)
  reviewUi?.openReview()
  return updated
}

const costApprovalSchema = { type: 'object', properties: { accepted: { type: 'boolean', const: true }, quoteFingerprint: { type: 'string', minLength: 1 } }, required: ['accepted', 'quoteFingerprint'], additionalProperties: false }
const commonProperties = {
  campaignId: { type: 'string' }, boardId: { type: 'string' }, expectedBoardVersion: { type: 'integer', minimum: 0 }, idempotencyKey: { type: 'string', minLength: 1, maxLength: 120 },
  territoryId: { type: 'string', minLength: 1, maxLength: 80 }, prompt: { type: 'string', minLength: 1, maxLength: 2000 },
  preserve: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 160 }, maxItems: 12 }, avoid: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 160 }, maxItems: 12 },
  quality: { type: 'string', enum: qualities }, costApproval: costApprovalSchema,
}

function costResponse(state: WorkspaceState, quote: ReturnType<typeof quoteImageGeneration>) {
  return success(state, { quote, generationStarted: false, nextStep: 'Call the same tool again with costApproval.accepted=true and this exact quoteFingerprint.' }, `Cost approval required before generating ${quote.imageCount} image${quote.imageCount === 1 ? '' : 's'} (estimated output $${quote.estimatedOutputUsd.toFixed(3)} plus input tokens).`)
}

export function createImageGenerationTools(runtime: WorkspaceRuntime, projectController: ProjectController, reviewUi?: ReviewUi): WebMCPTool[] {
  const controller = projectController.imageGeneration
  if (!controller) return []
  return [
    {
      name: 'generate_image_candidates', title: 'Generate image candidates', description: 'Generate 1–4 traceable image studies from an approved direction and selected board references. The first call discloses cost; an approved second call creates review proposals only.',
      inputSchema: { type: 'object', properties: { ...commonProperties, purpose: { type: 'string', const: 'campaign-image' }, referenceItemIds: { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 1, maxItems: 8, uniqueItems: true }, aspectRatio: { type: 'string', enum: ratios }, candidateCount: { type: 'integer', minimum: 1, maximum: 4 } }, required: [...mutationKeys, 'territoryId', 'purpose', 'referenceItemIds', 'prompt', 'preserve', 'avoid', 'aspectRatio', 'quality', 'candidateCount'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = baseInput(state, raw, ['territoryId', 'purpose', 'referenceItemIds', 'prompt', 'preserve', 'avoid', 'aspectRatio', 'quality', 'candidateCount', 'costApproval'])
        if (!input || input.purpose !== 'campaign-image' || !approvedRoute(state, input.territoryId) || !Array.isArray(input.referenceItemIds) || input.referenceItemIds.length < 1 || input.referenceItemIds.length > 8 || !input.referenceItemIds.every((id) => typeof id === 'string') || typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 2000 || !stringList(input.preserve, 12) || !stringList(input.avoid, 12) || !ratios.includes(input.aspectRatio as ImageAspectRatio) || !qualities.includes(input.quality as ImageGenerationQuality) || !Number.isInteger(input.candidateCount) || Number(input.candidateCount) < 1 || Number(input.candidateCount) > 4) return failure(state, 'VALIDATION_ERROR', 'Use an approved territory, 1–8 image references, a prompt, preserve/avoid lists, supported ratio and quality, and 1–4 candidates.')
        const references = referencesFor(state, input.referenceItemIds as string[])
        if (!references) return failure(state, 'REFERENCE_NOT_FOUND', 'Every referenceItemId must identify a current board item with an image.')
        const request = { operation: 'generate-candidates', territoryId: input.territoryId, purpose: input.purpose, referenceItemIds: input.referenceItemIds, prompt: input.prompt, preserve: input.preserve, avoid: input.avoid, aspectRatio: input.aspectRatio, quality: input.quality, candidateCount: input.candidateCount }
        const quote = quoteImageGeneration(input.quality as ImageGenerationQuality, input.candidateCount as number, request)
        if (!validApproval(input.costApproval, quote.quoteFingerprint)) return costResponse(state, quote)
        try {
          const fullPrompt = generationPrompt(state, input.territoryId as string, input.prompt, input.preserve as string[], input.avoid as string[], 'campaign-image')
          const run = await controller.execute({ runKey: crypto.randomUUID(), idempotencyKey: input.idempotencyKey as string, requestHash: stableImageFingerprint(request), boardVersionBefore: state.version, operation: 'generate-candidates', territoryId: input.territoryId as string, purpose: 'campaign-image', prompt: fullPrompt, preserve: input.preserve as string[], avoid: input.avoid as string[], quality: input.quality as ImageGenerationQuality, references, outputSpecs: [{ label: 'Campaign image study', aspectRatio: input.aspectRatio as ImageAspectRatio, size: IMAGE_SIZE_BY_RATIO[input.aspectRatio as ImageAspectRatio], count: input.candidateCount as number }], costQuote: quote, costApproval: input.costApproval as { accepted: true; quoteFingerprint: string } })
          const reviewed = await addRunToReview(runtime, controller, run, approvedRoute(state, input.territoryId)!.territory, input.idempotencyKey as string, reviewUi)
          return success(runtime.getSnapshot(), { run: reviewed, proposals: reviewed.proposalIds, requiresDesignerApproval: true }, `Generated ${reviewed.outputs.length} candidate${reviewed.outputs.length === 1 ? '' : 's'} into Review.`, undefined, true)
        } catch (error) { return failure(runtime.getSnapshot(), 'IMAGE_GENERATION_FAILED', error instanceof Error ? error.message : 'Image generation failed.', true) }
      },
    },
    {
      name: 'edit_image_candidate', title: 'Edit an image candidate', description: 'Create an immutable new version of a generated candidate, optionally guided by a normalized crop region or painted-mask image URL. The original is never overwritten.',
      inputSchema: { type: 'object', properties: { ...commonProperties, candidateId: { type: 'string', minLength: 1 }, aspectRatio: { type: 'string', enum: ratios }, crop: { type: 'object', properties: { x: { type: 'number', minimum: 0, maximum: 100 }, y: { type: 'number', minimum: 0, maximum: 100 }, width: { type: 'number', exclusiveMinimum: 0, maximum: 100 }, height: { type: 'number', exclusiveMinimum: 0, maximum: 100 } }, required: ['x', 'y', 'width', 'height'], additionalProperties: false }, maskImageUrl: { type: 'string' } }, required: [...mutationKeys, 'territoryId', 'candidateId', 'prompt', 'preserve', 'avoid', 'aspectRatio', 'quality'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = baseInput(state, raw, ['territoryId', 'candidateId', 'prompt', 'preserve', 'avoid', 'aspectRatio', 'quality', 'crop', 'maskImageUrl', 'costApproval'])
        const source = input ? generatedSource(state, input.candidateId) : undefined
        const crop = input?.crop as CropRect | undefined
        const cropValid = crop === undefined || (isObject(crop) && [crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) && crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0 && crop.x + crop.width <= 100 && crop.y + crop.height <= 100)
        if (!input || !source || !approvedRoute(state, input.territoryId) || typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 2000 || !stringList(input.preserve, 12) || !stringList(input.avoid, 12) || !ratios.includes(input.aspectRatio as ImageAspectRatio) || !qualities.includes(input.quality as ImageGenerationQuality) || !cropValid || (input.maskImageUrl !== undefined && (typeof input.maskImageUrl !== 'string' || !publicImageUrl(input.maskImageUrl)))) return failure(state, 'VALIDATION_ERROR', 'Use an existing generated candidate, approved territory, edit prompt, optional valid crop or public HTTPS mask URL, and supported output settings.')
        const request = { operation: 'edit-candidate', territoryId: input.territoryId, candidateId: source.generation.assetKey, prompt: input.prompt, preserve: input.preserve, avoid: input.avoid, aspectRatio: input.aspectRatio, quality: input.quality, crop: input.crop ?? null, maskImageUrl: input.maskImageUrl ?? null }
        const quote = quoteImageGeneration(input.quality as ImageGenerationQuality, 1, request)
        if (!validApproval(input.costApproval, quote.quoteFingerprint)) return costResponse(state, quote)
        try {
          const fullPrompt = generationPrompt(state, input.territoryId as string, input.prompt, input.preserve as string[], input.avoid as string[], source.generation.purpose, crop)
          const run = await controller.execute({ runKey: crypto.randomUUID(), idempotencyKey: input.idempotencyKey as string, requestHash: stableImageFingerprint(request), boardVersionBefore: state.version, operation: 'edit-candidate', territoryId: input.territoryId as string, purpose: source.generation.purpose, prompt: fullPrompt, preserve: input.preserve as string[], avoid: input.avoid as string[], quality: input.quality as ImageGenerationQuality, references: [{ itemId: source.generation.assetKey, title: source.title, imageUrl: absoluteImageUrl(source.imageUrl) }], outputSpecs: [{ label: `${source.title} · edit`, aspectRatio: input.aspectRatio as ImageAspectRatio, size: IMAGE_SIZE_BY_RATIO[input.aspectRatio as ImageAspectRatio], count: 1 }], parentAssetKey: source.generation.assetKey, ...(typeof input.maskImageUrl === 'string' ? { maskImageUrl: absoluteImageUrl(input.maskImageUrl) } : {}), costQuote: quote, costApproval: input.costApproval as { accepted: true; quoteFingerprint: string } })
          const reviewed = await addRunToReview(runtime, controller, run, approvedRoute(state, input.territoryId)!.territory, input.idempotencyKey as string, reviewUi)
          return success(runtime.getSnapshot(), { run: reviewed, previousAssetKey: source.generation.assetKey, newAssetKey: reviewed.outputs[0]?.assetKey, requiresDesignerApproval: true }, 'Created an immutable edited candidate in Review.', undefined, true)
        } catch (error) { return failure(runtime.getSnapshot(), 'IMAGE_EDIT_FAILED', error instanceof Error ? error.message : 'Image editing failed.', true) }
      },
    },
    {
      name: 'generate_campaign_applications', title: 'Generate campaign applications', description: 'Adapt one approved board asset and an approved direction into named raster image layers. Outputs enter Review and never replace canonical designer-set typography.',
      inputSchema: { type: 'object', properties: { ...commonProperties, sourceItemId: { type: 'string', minLength: 1 }, referenceItemIds: { type: 'array', items: { type: 'string', minLength: 1 }, maxItems: 7, uniqueItems: true }, formats: { type: 'array', items: { type: 'string', enum: applicationFormats }, minItems: 1, maxItems: 4, uniqueItems: true } }, required: [...mutationKeys, 'territoryId', 'sourceItemId', 'referenceItemIds', 'formats', 'prompt', 'preserve', 'avoid', 'quality'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot(); const input = baseInput(state, raw, ['territoryId', 'sourceItemId', 'referenceItemIds', 'formats', 'prompt', 'preserve', 'avoid', 'quality', 'costApproval'])
        const route = input ? approvedRoute(state, input.territoryId) : undefined
        const source = input && typeof input.sourceItemId === 'string' ? state.boardItems.find((item) => item.id === input.sourceItemId && item.imageUrl) : undefined
        const extraIds = input && Array.isArray(input.referenceItemIds) ? input.referenceItemIds as string[] : []
        const allIds = source ? [source.id, ...extraIds.filter((id) => id !== source.id)] : []
        const formats = input?.formats as CampaignApplicationFormat[] | undefined
        if (!input || !route || !source || !formats || formats.length < 1 || formats.length > 4 || !formats.every((format) => applicationFormats.includes(format)) || !stringList(extraIds, 7) || typeof input.prompt !== 'string' || !input.prompt.trim() || !stringList(input.preserve, 12) || !stringList(input.avoid, 12) || !qualities.includes(input.quality as ImageGenerationQuality)) return failure(state, 'VALIDATION_ERROR', 'Applications require one approved board asset, an approved territory, 1–4 named formats, and valid creative instructions.')
        const references = referencesFor(state, allIds)
        if (!references) return failure(state, 'REFERENCE_NOT_FOUND', 'Every application reference must be an approved board item with an image.')
        const request = { operation: 'generate-applications', territoryId: input.territoryId, sourceItemId: source.id, referenceItemIds: extraIds, formats, prompt: input.prompt, preserve: input.preserve, avoid: input.avoid, quality: input.quality }
        const quote = quoteImageGeneration(input.quality as ImageGenerationQuality, formats.length, request)
        if (!validApproval(input.costApproval, quote.quoteFingerprint)) return costResponse(state, quote)
        const outputSpecs: ImageGenerationOutputSpec[] = formats.map((format) => ({ label: `${route.name} · ${format}`, applicationFormat: format, aspectRatio: applicationRatio[format], size: IMAGE_SIZE_BY_RATIO[applicationRatio[format]], count: 1 }))
        try {
          const fullPrompt = generationPrompt(state, route.id, input.prompt, input.preserve as string[], input.avoid as string[], 'campaign-application')
          const run = await controller.execute({ runKey: crypto.randomUUID(), idempotencyKey: input.idempotencyKey as string, requestHash: stableImageFingerprint(request), boardVersionBefore: state.version, operation: 'generate-applications', territoryId: route.id, purpose: 'campaign-application', prompt: fullPrompt, preserve: input.preserve as string[], avoid: input.avoid as string[], quality: input.quality as ImageGenerationQuality, references, outputSpecs, costQuote: quote, costApproval: input.costApproval as { accepted: true; quoteFingerprint: string } })
          const reviewed = await addRunToReview(runtime, controller, run, route.territory, input.idempotencyKey as string, reviewUi)
          return success(runtime.getSnapshot(), { run: reviewed, applications: reviewed.outputs.map((output) => ({ assetKey: output.assetKey, format: output.applicationFormat, proposalId: `generated-${output.assetKey}` })), requiresDesignerApproval: true, typographyBoundary: 'Generated outputs are raster image layers; final type remains editable and designer-set in Iterum.' }, `Generated ${reviewed.outputs.length} campaign application${reviewed.outputs.length === 1 ? '' : 's'} into Review.`, undefined, true)
        } catch (error) { return failure(runtime.getSnapshot(), 'APPLICATION_GENERATION_FAILED', error instanceof Error ? error.message : 'Campaign application generation failed.', true) }
      },
    },
    {
      name: 'get_image_generation_run', title: 'Read an image generation run', description: 'Read one persistent image-generation ledger entry including inputs, cost quote, model settings, immutable outputs, failures, and current proposal approval states.',
      inputSchema: { type: 'object', properties: { campaignId: { type: 'string' }, boardId: { type: 'string' }, runKey: { type: 'string', minLength: 1 } }, required: ['campaignId', 'boardId', 'runKey'], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (raw) => {
        const state = runtime.getSnapshot()
        if (!isObject(raw) || !exact(raw, ['campaignId', 'boardId', 'runKey']) || raw.campaignId !== state.campaign.id || raw.boardId !== state.campaign.boardId || typeof raw.runKey !== 'string' || !raw.runKey) return failure(state, 'VALIDATION_ERROR', 'Provide the open campaign, board, and one runKey.')
        try {
          const run = await controller.getRun(raw.runKey)
          if (!run) return failure(state, 'IMAGE_RUN_NOT_FOUND', 'No image-generation run with that key exists in this project.')
          const approvalStates = run.proposalIds.map((proposalId) => ({ proposalId, status: state.proposals.find((proposal) => proposal.id === proposalId)?.status ?? (state.boardItems.some((item) => item.sourceProposalId === proposalId) ? 'approved' : 'not-in-current-head') }))
          return success(state, { run, approvalStates }, `Image run ${run.runKey} is ${run.status}.`)
        } catch (error) { return failure(state, 'IMAGE_RUN_UNAVAILABLE', error instanceof Error ? error.message : 'The run ledger could not be read.', true) }
      },
    },
  ]
}
