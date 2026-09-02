'use client'

import { cropRect, extractDominantColors } from './palette'

export async function extractPaletteFromImage(imageUrl: string, crop: 'full' | 'center') {
  const image = new Image()
  image.decoding = 'async'
  image.src = imageUrl
  await image.decode()
  const source = cropRect(image.naturalWidth, image.naturalHeight, crop)
  const canvas = document.createElement('canvas')
  const target = Math.min(72, Math.max(source.width, source.height))
  canvas.width = target
  canvas.height = target
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Local color extraction is unavailable in this browser.')
  context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, target, target)
  return extractDominantColors(context.getImageData(0, 0, target, target).data)
}
