import { describe, expect, it } from 'vitest'

import { isPublicHttpUrl } from './public-url'

describe('isPublicHttpUrl', () => {
  it('accepts public web URLs and rejects private or credentialed targets', () => {
    expect(isPublicHttpUrl('https://example.com/reference')).toBe(true)
    expect(isPublicHttpUrl('http://127.0.0.1/reference')).toBe(false)
    expect(isPublicHttpUrl('http://192.168.1.8/reference')).toBe(false)
    expect(isPublicHttpUrl('https://user:pass@example.com/reference')).toBe(false)
    expect(isPublicHttpUrl('file:///tmp/reference')).toBe(false)
  })
})
