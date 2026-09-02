export type Rgb = readonly [number, number, number]

const BUCKET_SIZE = 32

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

export function rgbToHex([red, green, blue]: Rgb) {
  return `#${[red, green, blue].map((value) => clampByte(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

export function hexToRgb(hex: string): Rgb | null {
  if (!/^#[0-9A-F]{6}$/i.test(hex)) return null
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)]
}

/** Deterministic, local-only quantization for reference images and crops. */
export function extractDominantColors(pixels: Uint8ClampedArray, count = 6): string[] {
  const buckets = new Map<string, { total: number; red: number; green: number; blue: number }>()

  for (let index = 0; index < pixels.length; index += 4) {
    const [red, green, blue, alpha] = [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]]
    if (alpha < 180) continue
    const key = [red, green, blue].map((value) => Math.floor(value / BUCKET_SIZE)).join(':')
    const bucket = buckets.get(key) ?? { total: 0, red: 0, green: 0, blue: 0 }
    bucket.total += 1
    bucket.red += red
    bucket.green += green
    bucket.blue += blue
    buckets.set(key, bucket)
  }

  return [...buckets.values()]
    .sort((left, right) => right.total - left.total || rgbToHex([left.red / left.total, left.green / left.total, left.blue / left.total]).localeCompare(rgbToHex([right.red / right.total, right.green / right.total, right.blue / right.total])))
    .slice(0, count)
    .map((bucket) => rgbToHex([bucket.red / bucket.total, bucket.green / bucket.total, bucket.blue / bucket.total]))
}

export function cropRect(width: number, height: number, crop: 'full' | 'center') {
  if (crop === 'full') return { x: 0, y: 0, width, height }
  const size = Math.min(width, height)
  return { x: Math.round((width - size) / 2), y: Math.round((height - size) / 2), width: size, height: size }
}
