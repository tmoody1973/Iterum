import { describe, expect, it } from 'vitest'

import { createDemoWorkspaceState } from '../domain/demo-data'
import { boundsForItems, fitBounds, itemIntersectsBounds, viewportCenter, viewportFromCenter, zoomAtPoint } from './viewport'

describe('board viewport geometry', () => {
  it('fits the full mechanical inside the measured viewport', () => {
    const bounds = boundsForItems(createDemoWorkspaceState().boardItems, true)
    const fitted = fitBounds(bounds, { width: 640, height: 560 })
    expect(fitted.scale).toBeGreaterThanOrEqual(.25)
    expect(fitted.scale).toBeLessThan(1)
    expect(viewportCenter(fitted, { width: 640, height: 560 })).toEqual({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 })
  })

  it('keeps the world point beneath the pointer stable while zooming', () => {
    const pointer = { x: 180, y: 120 }
    const original = { x: 30, y: 20, scale: .5 }
    const before = { x: (pointer.x - original.x) / original.scale, y: (pointer.y - original.y) / original.scale }
    const next = zoomAtPoint(original, 1.25, pointer)
    expect({ x: (pointer.x - next.x) / next.scale, y: (pointer.y - next.y) / next.scale }).toEqual(before)
  })

  it('round trips a world-space center and detects visible items', () => {
    const size = { width: 800, height: 600 }
    const viewport = viewportFromCenter({ x: 500, y: 420 }, 1.4, size)
    expect(viewportCenter(viewport, size).x).toBeCloseTo(500)
    expect(viewportCenter(viewport, size).y).toBeCloseTo(420)
    const specimen = createDemoWorkspaceState().boardItems.find((item) => item.id === 'type-specimen-headline')!
    expect(itemIntersectsBounds(specimen, { x: 700, y: 400, width: 420, height: 300 })).toBe(true)
  })
})
