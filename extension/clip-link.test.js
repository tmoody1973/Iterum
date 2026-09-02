import { describe, expect, it } from 'vitest'

import { buildIterumClipUrl } from './clip-link.js'

describe('Iterum extension clip link', () => {
  it('preserves the source and optional image in a one-time local handoff', () => {
    const result = buildIterumClipUrl({ id: 'clip-7', title: 'Material study', sourceUrl: 'https://example.com/material', imageUrl: 'https://images.example.com/material.jpg' })
    const url = new URL(result)
    expect(url.origin).toBe('http://127.0.0.1:3333')
    expect(url.searchParams.get('clip_source')).toBe('https://example.com/material')
    expect(url.searchParams.get('clip_image')).toBe('https://images.example.com/material.jpg')
  })

  it('refuses non-web source schemes', () => {
    expect(buildIterumClipUrl({ id: 'clip-8', title: 'Unsafe', sourceUrl: 'javascript:alert(1)' })).toBeNull()
  })
})
