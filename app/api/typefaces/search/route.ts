import { NextRequest, NextResponse } from 'next/server'

import type { TypefaceCandidate, TypefaceCategory } from '../../../../lib/domain/types'
import type { TypefaceSearchResponse } from '../../../../lib/typefaces/types'

type FontsourceFont = { id?: string; family?: string; subsets?: string[]; weights?: number[]; styles?: string[]; category?: string; type?: string }
type GoogleFont = { family?: string; variants?: string[]; subsets?: string[]; category?: string }

const categories = ['serif', 'sans-serif', 'display', 'handwriting', 'monospace'] as const
const commercialReferences: TypefaceCandidate[] = [
  { id: 'commercial-druk', family: 'Druk', category: 'display', source: 'commercial-reference', sourceLabel: 'Commercial Type', license: 'Commercial license required', referenceOnly: true, weights: [400, 700], styles: ['normal'] },
  { id: 'commercial-canela', family: 'Canela', category: 'serif', source: 'commercial-reference', sourceLabel: 'Commercial Type', license: 'Commercial license required', referenceOnly: true, weights: [400, 700], styles: ['normal', 'italic'] },
  { id: 'commercial-gt-america', family: 'GT America', category: 'sans-serif', source: 'commercial-reference', sourceLabel: 'Grilli Type', license: 'Commercial license required', referenceOnly: true, weights: [400, 700], styles: ['normal', 'italic'] },
  { id: 'commercial-soehne', family: 'Söhne', category: 'sans-serif', source: 'commercial-reference', sourceLabel: 'Klim Type Foundry', license: 'Commercial license required', referenceOnly: true, weights: [400, 700], styles: ['normal', 'italic'] },
]

function categoryOf(value: string | undefined): TypefaceCategory { return categories.includes(value as TypefaceCategory) ? value as TypefaceCategory : 'sans-serif' }
function matches(candidate: TypefaceCandidate, query: string, category: string) {
  return (category === 'all' || candidate.category === category) && (!query || `${candidate.family} ${candidate.category} ${candidate.sourceLabel}`.toLocaleLowerCase().includes(query))
}
function fontsourceCandidate(font: FontsourceFont): TypefaceCandidate | null {
  if (!font.id || !font.family || !font.subsets?.includes('latin') || !font.weights?.length || !font.styles?.length) return null
  return { id: font.id, family: font.family, category: categoryOf(font.category), source: 'fontsource', sourceLabel: 'Fontsource', license: 'Open-source via Fontsource; verify family license', referenceOnly: false, weights: font.weights, styles: font.styles.filter((style) => style === 'normal' || style === 'italic'), cssUrl: `https://cdn.jsdelivr.net/fontsource/css/${font.id}@latest/index.css`, referenceUrl: `https://fontsource.org/fonts/${font.id}` }
}
function googleCandidate(font: GoogleFont): TypefaceCandidate | null {
  if (!font.family || !font.subsets?.includes('latin') || !font.variants?.length) return null
  const weights = [...new Set(font.variants.map((variant) => variant.match(/\d{3}/)?.[0] ?? (variant.startsWith('regular') || variant === 'italic' ? '400' : '')).filter(Boolean).map(Number))]
  if (!weights.length) weights.push(400)
  const familyParam = font.family.trim().replace(/\s+/g, '+')
  return { id: `google-${font.family.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`, family: font.family, category: categoryOf(font.category), source: 'google-fonts', sourceLabel: 'Google Fonts', license: 'Open-source via Google Fonts; verify family license', referenceOnly: false, weights, styles: font.variants.some((variant) => variant.includes('italic')) ? ['normal', 'italic'] : ['normal'], cssUrl: `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`, referenceUrl: `https://fonts.google.com/specimen/${familyParam}` }
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().toLocaleLowerCase().slice(0, 120)
  const categoryParam = request.nextUrl.searchParams.get('category') ?? 'all'
  const category = categoryParam === 'all' || categories.includes(categoryParam as TypefaceCategory) ? categoryParam as TypefaceCategory | 'all' : 'all'
  const includeCommercial = request.nextUrl.searchParams.get('includeCommercial') === 'true'
  const count = Math.min(12, Math.max(1, Number(request.nextUrl.searchParams.get('count')) || 8))

  try {
    const response = await fetch('https://api.fontsource.org/v1/fonts?subsets=latin', { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error('Fontsource catalog is unavailable.')
    const fontsource = (await response.json() as FontsourceFont[]).map(fontsourceCandidate).filter((item): item is TypefaceCandidate => Boolean(item)).filter((item) => matches(item, query, category))

    let google: TypefaceCandidate[] = []
    const googleKey = process.env.GOOGLE_FONTS_API_KEY
    if (googleKey) {
      const endpoint = new URL('https://www.googleapis.com/webfonts/v1/webfonts')
      endpoint.searchParams.set('key', googleKey); endpoint.searchParams.set('sort', 'popularity'); endpoint.searchParams.set('subset', 'latin')
      if (query) endpoint.searchParams.set('family', query)
      const googleResponse = await fetch(endpoint, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(15_000) })
      if (googleResponse.ok) google = ((await googleResponse.json() as { items?: GoogleFont[] }).items ?? []).map(googleCandidate).filter((item): item is TypefaceCandidate => Boolean(item)).filter((item) => matches(item, query, category))
    }

    const combined = [...(includeCommercial ? commercialReferences.filter((item) => matches(item, query, category)) : []), ...fontsource, ...google]
    const unique = [...new Map(combined.map((item) => [item.family.toLocaleLowerCase(), item])).values()].slice(0, count)
    const payload: TypefaceSearchResponse = { query, category, includeCommercial, googleFontsConfigured: Boolean(googleKey), results: unique, ...(!googleKey ? { note: 'Fontsource is active. Add GOOGLE_FONTS_API_KEY for secondary catalog metadata.' } : {}) }
    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Typeface search is unavailable.' }, { status: 502 })
  }
}
