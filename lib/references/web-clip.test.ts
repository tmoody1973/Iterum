import { describe, expect, it } from 'vitest'

import { parseWebClipUrl, urlWithoutWebClip } from './web-clip'

describe('web clip handoff', () => {
  it('accepts one public source and optional public image', () => {
    const url = new URL('http://127.0.0.1:3333/')
    url.search = new URLSearchParams({ clip: '1', clip_id: 'clip-42', clip_source: 'https://studio.example.com/story', clip_image: 'https://cdn.example.com/image.jpg', clip_title: '  Mineral / Glass  ' }).toString()
    expect(parseWebClipUrl(url)).toEqual({ ok: true, clip: { id: 'clip-42', title: 'Mineral / Glass', sourceUrl: 'https://studio.example.com/story', imageUrl: 'https://cdn.example.com/image.jpg' } })
  })

  it('rejects private or executable handoffs', () => {
    expect(parseWebClipUrl('http://127.0.0.1:3333/?clip=1&clip_id=x&clip_source=http%3A%2F%2F127.0.0.1%2Fsecret')).toMatchObject({ ok: false })
    expect(parseWebClipUrl('http://127.0.0.1:3333/?clip=1&clip_id=x&clip_source=https%3A%2F%2Fexample.com&clip_image=javascript%3Aalert(1)')).toMatchObject({ ok: false })
  })

  it('removes only the one-time handoff parameters', () => {
    expect(urlWithoutWebClip('http://127.0.0.1:3333/?view=board&clip=1&clip_id=x&clip_source=https%3A%2F%2Fexample.com#proof')).toBe('/?view=board#proof')
  })
})
