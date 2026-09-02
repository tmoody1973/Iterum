import type { BoardItem, Point } from '../domain/types'

export const MIN_BOARD_SCALE = 0.25
export const MAX_BOARD_SCALE = 3
export const BOARD_VIEW_PADDING = 28

export type BoardViewport = Point & { scale: number }
export type ViewportSize = { width: number; height: number }
export type BoardBounds = Point & { width: number; height: number }

/** The mechanical includes the campaign proof as well as canonical board items. */
export const BASE_BOARD_BOUNDS: BoardBounds = { x: 0, y: 0, width: 1120, height: 900 }

export interface BoardViewportController {
  getViewport(): BoardViewport
  getViewportSize(): ViewportSize
  setViewport(viewport: BoardViewport, mode?: 'fit' | 'custom'): void
}

export function clampBoardScale(scale: number) {
  return Math.min(MAX_BOARD_SCALE, Math.max(MIN_BOARD_SCALE, scale))
}

export function boundsForItems(items: BoardItem[], includeMechanical = false): BoardBounds {
  if (items.length === 0) return includeMechanical ? BASE_BOARD_BOUNDS : { x: 0, y: 0, width: 1, height: 1 }
  const minX = Math.min(...items.map((item) => item.position.x))
  const minY = Math.min(...items.map((item) => item.position.y))
  const maxX = Math.max(...items.map((item) => item.position.x + item.width))
  const maxY = Math.max(...items.map((item) => item.position.y + item.height))
  const itemBounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  if (!includeMechanical) return itemBounds
  const right = Math.max(BASE_BOARD_BOUNDS.x + BASE_BOARD_BOUNDS.width, maxX)
  const bottom = Math.max(BASE_BOARD_BOUNDS.y + BASE_BOARD_BOUNDS.height, maxY)
  return {
    x: Math.min(BASE_BOARD_BOUNDS.x, minX),
    y: Math.min(BASE_BOARD_BOUNDS.y, minY),
    width: right - Math.min(BASE_BOARD_BOUNDS.x, minX),
    height: bottom - Math.min(BASE_BOARD_BOUNDS.y, minY),
  }
}

export function fitBounds(bounds: BoardBounds, viewport: ViewportSize, padding = BOARD_VIEW_PADDING): BoardViewport {
  const availableWidth = Math.max(1, viewport.width - padding * 2)
  const availableHeight = Math.max(1, viewport.height - padding * 2)
  const scale = clampBoardScale(Math.min(availableWidth / Math.max(1, bounds.width), availableHeight / Math.max(1, bounds.height)))
  return {
    scale,
    x: viewport.width / 2 - (bounds.x + bounds.width / 2) * scale,
    y: viewport.height / 2 - (bounds.y + bounds.height / 2) * scale,
  }
}

export function viewportCenter(viewport: BoardViewport, size: ViewportSize): Point {
  return {
    x: (size.width / 2 - viewport.x) / viewport.scale,
    y: (size.height / 2 - viewport.y) / viewport.scale,
  }
}

export function viewportFromCenter(center: Point, scale: number, size: ViewportSize): BoardViewport {
  const boundedScale = clampBoardScale(scale)
  return {
    scale: boundedScale,
    x: size.width / 2 - center.x * boundedScale,
    y: size.height / 2 - center.y * boundedScale,
  }
}

export function zoomAtPoint(viewport: BoardViewport, nextScale: number, pointer: Point): BoardViewport {
  const boundedScale = clampBoardScale(nextScale)
  const worldPoint = {
    x: (pointer.x - viewport.x) / viewport.scale,
    y: (pointer.y - viewport.y) / viewport.scale,
  }
  return {
    scale: boundedScale,
    x: pointer.x - worldPoint.x * boundedScale,
    y: pointer.y - worldPoint.y * boundedScale,
  }
}

export function visibleWorldBounds(viewport: BoardViewport, size: ViewportSize): BoardBounds {
  return {
    x: -viewport.x / viewport.scale,
    y: -viewport.y / viewport.scale,
    width: size.width / viewport.scale,
    height: size.height / viewport.scale,
  }
}

export function itemIntersectsBounds(item: BoardItem, bounds: BoardBounds) {
  return item.position.x < bounds.x + bounds.width
    && item.position.x + item.width > bounds.x
    && item.position.y < bounds.y + bounds.height
    && item.position.y + item.height > bounds.y
}
