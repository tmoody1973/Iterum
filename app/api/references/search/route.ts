import { NextRequest, NextResponse } from 'next/server'

import type { ReferenceSearchResponse } from '../../../../lib/references/types'

type PexelsPhoto = {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  alt?: string
  src: { medium: string; large2x?: string; large?: string; original: string }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const requestedCount = Number(request.nextUrl.searchParams.get('count') ?? 8)
  const count = Number.isInteger(requestedCount) ? Math.min(12, Math.max(1, requestedCount)) : 8
  if (query.length < 2 || query.length > 120) return NextResponse.json({ error: 'Search must be between 2 and 120 characters.' }, { status: 400 })

  const key = process.env.PEXELS_API_KEY
  if (!key) {
    const response: ReferenceSearchResponse = { provider: 'pexels', configured: false, results: [], note: 'Add PEXELS_API_KEY to enable licensed reference search.' }
    return NextResponse.json(response)
  }

  const endpoint = new URL('https://api.pexels.com/v1/search')
  endpoint.searchParams.set('query', query)
  endpoint.searchParams.set('per_page', String(count))
  endpoint.searchParams.set('orientation', 'portrait')
  try {
    const response = await fetch(endpoint, { headers: { Authorization: key }, cache: 'no-store', signal: AbortSignal.timeout(12_000) })
    const payload = await response.json() as { photos?: PexelsPhoto[]; error?: string }
    if (!response.ok || !payload.photos) throw new Error(payload.error || 'Pexels search is unavailable.')
    const result: ReferenceSearchResponse = {
      provider: 'pexels', configured: true,
      results: payload.photos.map((photo) => ({
        id: `pexels-${photo.id}`,
        title: photo.alt?.trim() || `${query} — Pexels ${photo.id}`,
        imageUrl: photo.src.large2x || photo.src.large || photo.src.original,
        thumbnailUrl: photo.src.medium,
        sourceUrl: photo.url,
        attribution: `Photo by ${photo.photographer} on Pexels`,
        rightsStatus: 'cleared',
        provider: 'pexels',
        width: photo.width,
        height: photo.height,
        crop: { x: 0, y: 0, width: 100, height: 100 },
      })),
    }
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Pexels search is unavailable.' }, { status: 502 })
  }
}
