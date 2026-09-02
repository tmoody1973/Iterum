'use client'

import { Group, Rect, Text } from 'react-konva'
import type Konva from 'konva'

import type { BoardItem } from '../../lib/domain/types'

export function ColorStripNode({ item, colors, selected, panEnabled, onSelect, onDragEnd, nodeRef }: {
  item: BoardItem
  colors: string[]
  selected: boolean
  panEnabled: boolean
  onSelect: () => void
  onDragEnd: (node: Konva.Group, position: { x: number; y: number }) => void
  nodeRef: (node: Konva.Group | null) => void
}) {
  const segmentWidth = item.width / Math.max(1, colors.length)
  return <Group id={item.id} ref={nodeRef} x={item.position.x} y={item.position.y} width={item.width} height={item.height} draggable={!item.locked && !panEnabled} onClick={onSelect} onTap={onSelect} onDragEnd={(event) => onDragEnd(event.target as Konva.Group, { x: event.target.x(), y: event.target.y() })}>
    <Rect width={item.width} height={item.height} fill="#ded5c7" stroke={selected ? '#4779b8' : '#171717'} strokeWidth={selected ? 4 : 1} shadowColor="rgba(45,35,22,.18)" shadowBlur={6} shadowOffsetY={3} />
    {colors.map((color, index) => <Rect key={`${color}-${index}`} x={segmentWidth * index} y={0} width={segmentWidth + (index === colors.length - 1 ? 0 : 1)} height={item.height} fill={color} stroke="rgba(0,0,0,.45)" strokeWidth={.5} />)}
    {item.height >= 42 && <Text x={8} y={item.height - 16} width={item.width - 16} text={item.locked ? 'CAMPAIGN COLOR STRIP · LOCKED' : 'CAMPAIGN COLOR STRIP · SELECT · MOVE · RESIZE'} fontFamily="IBM Plex Mono" fontSize={7} fill="#171717" />}
  </Group>
}
