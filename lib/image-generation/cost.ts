import type { ImageAspectRatio, ImageCostQuote, ImageGenerationQuality } from './types'

const OUTPUT_USD: Record<ImageGenerationQuality, number> = { low: 0.006, medium: 0.053, high: 0.211 }

export const IMAGE_SIZE_BY_RATIO: Record<ImageAspectRatio, string> = {
  '1:1': '1024x1024',
  '4:5': '1024x1280',
  '5:4': '1280x1024',
  '9:16': '1024x1824',
  '16:9': '1824x1024',
}

export function stableImageFingerprint(value: unknown) {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize)
    if (input && typeof input === 'object') return Object.fromEntries(Object.entries(input).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, normalize(child)]))
    return input
  }
  const serialized = JSON.stringify(normalize(value))
  let hash = 2166136261
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `imgq-v1-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function quoteImageGeneration(quality: ImageGenerationQuality, imageCount: number, request: unknown): ImageCostQuote {
  const estimatedOutputUsd = Number((OUTPUT_USD[quality] * imageCount).toFixed(3))
  return {
    model: 'gpt-image-2', quality, imageCount, estimatedOutputUsd, inputCostsNotIncluded: true,
    pricingBasis: 'Conservative GPT Image 2 output estimate using the published 1024×1024 rate; prompt and reference-image input tokens are additional.',
    pricingUrl: 'https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency',
    priceSnapshotDate: '2026-09-03',
    quoteFingerprint: stableImageFingerprint({ quality, imageCount, request }),
    requiresCostApproval: true,
  }
}
