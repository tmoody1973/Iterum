'use client'

import { Group, Rect, Text } from 'react-konva'
import type Konva from 'konva'

import type { BoardItem } from '../../lib/domain/types'

const TONES = {
  blue: { fill: '#dbe6f4', accent: '#4779b8' },
  ruby: { fill: '#ead8d2', accent: '#a05040' },
  paper: { fill: '#eee8dc', accent: '#554a3d' },
}

export function NoteNode({ item, selected, panEnabled, onSelect, onDragEnd, nodeRef }: {
  item: BoardItem
  selected: boolean
  panEnabled: boolean
  onSelect: () => void
  onDragEnd: (node: Konva.Group, position: { x: number; y: number }) => void
  nodeRef: (node: Konva.Group | null) => void
}) {
  const tone = TONES[item.noteTone ?? 'paper']
  return <Group id={item.id} ref={nodeRef} x={item.position.x} y={item.position.y} width={item.width} height={item.height} draggable={!panEnabled} onClick={onSelect} onTap={onSelect} onDragEnd={(event) => onDragEnd(event.target as Konva.Group, { x: event.target.x(), y: event.target.y() })}>
    <Rect width={item.width} height={item.height} fill={tone.fill} stroke={selected ? '#4779b8' : tone.accent} strokeWidth={selected ? 3 : 1} shadowColor="rgba(45,35,22,.2)" shadowBlur={8} shadowOffsetY={4} />
    <Rect x={0} y={0} width={5} height={item.height} fill={tone.accent} />
    <Text x={16} y={14} width={item.width - 30} text={`${item.territory.toUpperCase()} / DIRECTION NOTE`} fontFamily="IBM Plex Mono" fontSize={8} fill={tone.accent} />
    <Text x={16} y={34} width={item.width - 30} text={item.title.toUpperCase()} fontFamily="Barlow Condensed" fontStyle="bold" fontSize={20} fill="#171717" />
    <Text x={16} y={62} width={item.width - 30} height={item.height - 92} text={item.noteBody ?? ''} fontFamily="IBM Plex Mono" fontSize={10} lineHeight={1.35} fill="#403930" wrap="word" />
    <Text x={16} y={item.height - 22} width={item.width - 30} text={`${item.groupLabel ? `${item.groupLabel.toUpperCase()} · ` : ''}SELECT · MOVE · RESIZE`} fontFamily="IBM Plex Mono" fontSize={7} fill={tone.accent} />
  </Group>
}
