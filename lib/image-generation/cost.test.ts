import { describe, expect, it } from 'vitest'

import { quoteImageGeneration, stableImageFingerprint } from './cost'

describe('image generation cost boundary', () => {
  it('quotes published output cost separately from unknown input cost', () => {
    expect(quoteImageGeneration('medium', 3, { prompt: 'study' })).toMatchObject({
      model: 'gpt-image-2', imageCount: 3, estimatedOutputUsd: 0.159, inputCostsNotIncluded: true, requiresCostApproval: true,
    })
  })

  it('uses a stable deep fingerprint and changes it with nested inputs', () => {
    expect(stableImageFingerprint({ b: 2, a: { y: 2, x: 1 } })).toBe(stableImageFingerprint({ a: { x: 1, y: 2 }, b: 2 }))
    expect(stableImageFingerprint({ a: { x: 1 } })).not.toBe(stableImageFingerprint({ a: { x: 2 } }))
  })
})
