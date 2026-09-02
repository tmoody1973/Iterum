import { NextRequest, NextResponse } from 'next/server'

import { isPublicHttpUrl } from '../../../../lib/references/public-url'
import type { CapturedReference } from '../../../../lib/references/types'

type Media = { url?: string }
type MicrolinkData = {
  title?: string
  description?: string
  author?: string
  publisher?: string
  url?: string
  image?: Media
  screenshot?: Media
}

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get('url')
  if (!isPublicHttpUrl(sourceUrl)) return NextResponse.json({ error: 'Enter a public http(s) URL without credentials.' }, { status: 400 })

  const endpoint = new URL('https://api.microlink.io')
  endpoint.searchParams.set('url', sourceUrl)
  endpoint.searchParams.set('screenshot', 'true')
  endpoint.searchParams.set('palette', 'true')

  try {
    const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
    const payload = await response.json() as { status?: string; data?: MicrolinkData; message?: string } & MicrolinkData
    if (!response.ok || payload.status === 'fail') throw new Error(payload.message || 'Microlink could not capture this page.')
    const data = payload.data ?? payload
    const screenshotUrl = data.screenshot?.url
    const imageUrl = screenshotUrl ?? data.image?.url
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, '')
    const capture: CapturedReference = {
      title: data.title?.trim() || hostname,
      description: data.description?.trim() || 'Captured webpage reference.',
      ...(imageUrl ? { imageUrl } : {}),
      sourceUrl: data.url && isPublicHttpUrl(data.url) ? data.url : sourceUrl,
      attribution: data.author?.trim() || data.publisher?.trim() || hostname,
      rightsStatus: 'uncertain',
      provider: 'microlink',
      previewKind: screenshotUrl ? 'screenshot' : imageUrl ? 'image' : 'none',
      crop: { x: 0, y: 0, width: 100, height: 100 },
    }
    return NextResponse.json(capture)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'URL capture is unavailable.' }, { status: 502 })
  }
}
