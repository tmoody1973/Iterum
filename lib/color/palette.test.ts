import { describe, expect, it } from 'vitest'

import { cropRect, extractDominantColors, hexToRgb, rgbToHex } from './palette'

describe('local palette extraction', () => {
  it('extracts deterministic dominant colors from image pixels', () => {
    const pixels = new Uint8ClampedArray([
      201, 100, 50, 255,
      203, 99, 49, 255,
      201, 100, 50, 255,
      20, 30, 40, 255,
    ])

    expect(extractDominantColors(pixels, 2)).toEqual(['#CA6432', '#141E28'])
  })

  it('does not treat transparent pixels as reference color data', () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 0,
      10, 20, 30, 255,
    ])

    expect(extractDominantColors(pixels)).toEqual(['#0A141E'])
  })

  it('keeps crop geometry and color conversions reproducible', () => {
    expect(cropRect(1200, 800, 'center')).toEqual({ x: 200, y: 0, width: 800, height: 800 })
    expect(hexToRgb('#4779B8')).toEqual([71, 121, 184])
    expect(rgbToHex([71, 121, 184])).toBe('#4779B8')
  })
})
