import { z } from 'zod'

const querySchema = z.object({
  hex: z.string().regex(/^#[0-9A-F]{6}$/i),
  mode: z.enum(['monochrome', 'monochrome-dark', 'monochrome-light', 'analogic', 'complement', 'analogic-complement', 'triad', 'quad']).default('analogic'),
})

const colorApiResponse = z.object({
  colors: z.array(z.object({
    hex: z.object({ value: z.string().regex(/^#[0-9A-F]{6}$/i) }),
    name: z.object({ value: z.string() }),
    rgb: z.object({ value: z.string() }),
    hsl: z.object({ value: z.string() }),
    cmyk: z.object({ value: z.string() }),
  })).min(1),
})

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return Response.json({ error: 'Provide a hexadecimal seed and supported harmony mode.' }, { status: 400 })

  const providerUrl = new URL('https://www.thecolorapi.com/scheme')
  providerUrl.searchParams.set('hex', parsed.data.hex.slice(1))
  providerUrl.searchParams.set('mode', parsed.data.mode)
  providerUrl.searchParams.set('count', '5')

  try {
    const response = await fetch(providerUrl, { next: { revalidate: 60 * 60 * 24 } })
    if (!response.ok) return Response.json({ error: 'The Color API is unavailable. Your local extraction is still saved.' }, { status: 502 })
    const payload = colorApiResponse.safeParse(await response.json())
    if (!payload.success) return Response.json({ error: 'The Color API returned an unexpected palette.' }, { status: 502 })
    return Response.json({
      source: 'the-color-api', mode: parsed.data.mode,
      colors: payload.data.colors.map((color) => ({ hex: color.hex.value.toUpperCase(), name: color.name.value, rgb: color.rgb.value, hsl: color.hsl.value, cmyk: color.cmyk.value })),
    }, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } })
  } catch {
    return Response.json({ error: 'The Color API could not be reached. Your local extraction is still saved.' }, { status: 502 })
  }
}
