export type ImageGenerationOperation = 'generate-candidates' | 'edit-candidate' | 'generate-applications'
export type ImageGenerationQuality = 'low' | 'medium' | 'high'
export type ImageAspectRatio = '1:1' | '4:5' | '5:4' | '9:16' | '16:9'
export type CampaignApplicationFormat = 'poster-4:5' | 'story-9:16' | 'landing-hero-16:9' | 'square-1:1'
export type ImageGenerationRunStatus = 'running' | 'generated' | 'awaiting-review' | 'failed'

export interface ImageCostQuote {
  model: 'gpt-image-2'
  quality: ImageGenerationQuality
  imageCount: number
  estimatedOutputUsd: number
  inputCostsNotIncluded: true
  pricingBasis: string
  pricingUrl: 'https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency'
  priceSnapshotDate: '2026-09-03'
  quoteFingerprint: string
  requiresCostApproval: true
}

export interface ImageGenerationReference {
  itemId: string
  title: string
  imageUrl: string
}

export interface ImageGenerationOutputSpec {
  label: string
  aspectRatio: ImageAspectRatio
  size: string
  count: number
  applicationFormat?: CampaignApplicationFormat
}

export interface ExecuteImageGenerationInput {
  projectKey: string
  runKey: string
  idempotencyKey: string
  requestHash: string
  boardVersionBefore: number
  operation: ImageGenerationOperation
  territoryId: string
  purpose: string
  prompt: string
  preserve: string[]
  avoid: string[]
  quality: ImageGenerationQuality
  references: ImageGenerationReference[]
  outputSpecs: ImageGenerationOutputSpec[]
  parentAssetKey?: string
  maskImageUrl?: string
  costQuote: ImageCostQuote
  costApproval: { accepted: true; quoteFingerprint: string }
}

export interface GeneratedImageAsset {
  assetKey: string
  runKey: string
  parentAssetKey?: string
  version: number
  label: string
  imageUrl: string
  mediaType: 'image/webp'
  width: number
  height: number
  purpose: string
  applicationFormat?: CampaignApplicationFormat
  model: 'gpt-image-2'
  prompt: string
  referenceItemIds: string[]
  createdAt: number
}

export interface ImageGenerationRun {
  runKey: string
  operation: ImageGenerationOperation
  status: ImageGenerationRunStatus
  model: 'gpt-image-2'
  quality: ImageGenerationQuality
  territoryId: string
  purpose: string
  prompt: string
  preserve: string[]
  avoid: string[]
  referenceItemIds: string[]
  outputSpecs: ImageGenerationOutputSpec[]
  costQuote: ImageCostQuote
  boardVersionBefore: number
  boardVersionAfter?: number
  proposalIds: string[]
  outputs: GeneratedImageAsset[]
  requestId?: string
  error?: { code: string; message: string; retryable: boolean }
  createdAt: number
  completedAt?: number
}

export interface ImageGenerationController {
  execute(input: Omit<ExecuteImageGenerationInput, 'projectKey'>): Promise<ImageGenerationRun>
  markAwaitingReview(runKey: string, proposalIds: string[], boardVersionAfter: number): Promise<ImageGenerationRun>
  getRun(runKey: string): Promise<ImageGenerationRun | null>
}
