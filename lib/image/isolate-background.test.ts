import { describe, expect, it } from 'vitest'

import { isolateBackgroundPixels } from './isolate-background'

const pixel = (red: number, green: number, blue: number, alpha = 255) => [red, green, blue, alpha]

describe('isolateBackgroundPixels', () => {
  it('removes an edge-connected light background while preserving a dark subject', () => {
    const width = 5; const height = 5; const values: number[] = []
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) values.push(...(x >= 1 && x <= 3 && y >= 1 && y <= 3 ? pixel(30, 25, 20) : pixel(245, 242, 238)))
    const result = isolateBackgroundPixels(new Uint8ClampedArray(values), width, height, 45)
    expect(result.data[3]).toBe(0)
    expect(result.data[((2 * width + 2) * 4) + 3]).toBe(255)
    expect(result.removedRatio).toBeGreaterThan(0.5)
  })

  it('does not remove a matching color enclosed inside the subject boundary', () => {
    const width = 7; const height = 7; const values: number[] = []
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1
      const isCenter = x === 3 && y === 3
      values.push(...(isBorder || isCenter ? pixel(250, 250, 250) : pixel(20, 20, 20)))
    }
    const result = isolateBackgroundPixels(new Uint8ClampedArray(values), width, height, 50)
    expect(result.data[((3 * width + 3) * 4) + 3]).toBe(255)
  })
})
