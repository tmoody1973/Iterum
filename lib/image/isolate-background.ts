'use client'

import type { ImageIsolation } from '../domain/types'

type Rgb = [number, number, number]

const distance = (data: Uint8ClampedArray, offset: number, sample: Rgb) => Math.sqrt(
  (data[offset] - sample[0]) ** 2 + (data[offset + 1] - sample[1]) ** 2 + (data[offset + 2] - sample[2]) ** 2,
)

function cornerSample(data: Uint8ClampedArray, width: number, height: number, cornerX: 0 | 1, cornerY: 0 | 1): Rgb {
  const size = Math.max(1, Math.min(5, Math.floor(Math.min(width, height) / 20)))
  let red = 0; let green = 0; let blue = 0; let count = 0
  const startX = cornerX ? width - size : 0
  const startY = cornerY ? height - size : 0
  for (let y = startY; y < startY + size; y += 1) for (let x = startX; x < startX + size; x += 1) {
    const offset = (y * width + x) * 4
    if (data[offset + 3] === 0) continue
    red += data[offset]; green += data[offset + 1]; blue += data[offset + 2]; count += 1
  }
  return count ? [red / count, green / count, blue / count] : [255, 255, 255]
}

/** Removes only corner-colored pixels connected to an image edge, preserving enclosed subject colors. */
export function isolateBackgroundPixels(source: Uint8ClampedArray, width: number, height: number, sensitivity = 50) {
  const data = new Uint8ClampedArray(source)
  const samples = [cornerSample(data, width, height, 0, 0), cornerSample(data, width, height, 1, 0), cornerSample(data, width, height, 0, 1), cornerSample(data, width, height, 1, 1)]
  const threshold = 18 + Math.max(0, Math.min(100, sensitivity)) * 1.05
  const feather = 16
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0; let tail = 0; let removed = 0
  const matchDistance = (pixel: number) => {
    const offset = pixel * 4
    let closest = Number.POSITIVE_INFINITY
    for (const sample of samples) closest = Math.min(closest, distance(data, offset, sample))
    return closest
  }
  const enqueue = (pixel: number) => {
    if (visited[pixel] || matchDistance(pixel) > threshold + feather) return
    visited[pixel] = 1; queue[tail] = pixel; tail += 1
  }
  for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x) }
  for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1) }
  while (head < tail) {
    const pixel = queue[head]; head += 1
    const x = pixel % width; const y = Math.floor(pixel / width); const offset = pixel * 4
    const closest = matchDistance(pixel)
    const alphaFactor = Math.max(0, Math.min(1, (closest - threshold) / feather))
    const previousAlpha = data[offset + 3]
    data[offset + 3] = Math.round(previousAlpha * alphaFactor)
    if (data[offset + 3] < previousAlpha / 2) removed += 1
    if (x > 0) enqueue(pixel - 1)
    if (x + 1 < width) enqueue(pixel + 1)
    if (y > 0) enqueue(pixel - width)
    if (y + 1 < height) enqueue(pixel + width)
  }
  return { data, removedRatio: removed / (width * height) }
}

function loadImage(sourceImageUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    if (/^https?:/i.test(sourceImageUrl)) image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The source image could not be read for local isolation.'))
    image.src = sourceImageUrl
  })
}

export async function isolateImageBackground(sourceImageUrl: string, sensitivity = 50): Promise<ImageIsolation> {
  const image = await loadImage(sourceImageUrl)
  const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale)); const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Local image processing is unavailable in this browser.')
  context.drawImage(image, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height)
  const isolated = isolateBackgroundPixels(pixels.data, width, height, sensitivity)
  pixels.data.set(isolated.data); context.putImageData(pixels, 0, 0)
  return { sourceImageUrl, imageDataUrl: canvas.toDataURL('image/png'), algorithm: 'iterum-border-matte-v1', sensitivity, removedRatio: isolated.removedRatio }
}
