import { z } from 'zod'

const bodySchema = z.object({ locked: z.array(z.string().regex(/^#[0-9A-F]{6}$/i)).min(1).max(2) })
const colormindResponse = z.object({ result: z.array(z.array(z.number().int().min(0).max(255)).length(3)).length(5) })

function hexToRgb(hex: string) { return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)] }
function rgbToHex([red, green, blue]: number[]) { return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase() }

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Lock one or two valid swatches before generating a direction.' }, { status: 400 })

  const input = [...parsed.data.locked.map(hexToRgb), ...Array.from({ length: 5 - parsed.data.locked.length }, () => 'N')]
  try {
    const response = await fetch('https://colormind.io/api/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'default', input }), cache: 'no-store' })
    if (!response.ok) return Response.json({ error: 'Colormind is unavailable. Try again later.' }, { status: 502 })
    const payload = colormindResponse.safeParse(await response.json())
    if (!payload.success) return Response.json({ error: 'Colormind returned an unexpected direction.' }, { status: 502 })
    return Response.json({ source: 'colormind', colors: payload.data.result.map(rgbToHex), note: 'Experimental direction — Colormind may slightly adjust locked input colors.' })
  } catch {
    return Response.json({ error: 'Colormind could not be reached. Try again later.' }, { status: 502 })
  }
}
