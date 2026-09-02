'use client'

import { Group, Rect, Text } from 'react-konva'
import type Konva from 'konva'

import type { BoardItem, TypeDirection } from '../../lib/domain/types'
import { fontFamilyFor } from '../typography/typeface-sample'

const FALLBACK_HEADLINE = "'Barlow Condensed', sans-serif"
const FALLBACK_BODY = "'Barlow', sans-serif"

export function TypeSpecimenNode({ item, direction, selected, panEnabled, onSelect, onDragEnd, nodeRef }: {
  item: BoardItem
  direction: TypeDirection | null
  selected: boolean
  panEnabled: boolean
  onSelect: () => void
  onDragEnd: (node: Konva.Group, position: { x: number; y: number }) => void
  nodeRef: (node: Konva.Group | null) => void
}) {
  const isHeadline = item.typeRole === 'headline'
  const candidate = isHeadline ? direction?.headline : direction?.body
  const family = fontFamilyFor(candidate) ?? (isHeadline ? FALLBACK_HEADLINE : FALLBACK_BODY)
  const familyLabel = candidate?.family ?? (isHeadline ? 'Barlow Condensed' : 'Barlow')
  const specimen = isHeadline
    ? (direction?.specimenText || 'The air remembers.').replace(' ', '\n')
    : 'Ozone / crushed iris / mineral rain\nWarm concrete / skin / 50 ml'

  return <Group id={item.id} ref={nodeRef} x={item.position.x} y={item.position.y} width={item.width} height={item.height} draggable={!item.locked && !panEnabled} onClick={onSelect} onTap={onSelect} onDragEnd={(event) => onDragEnd(event.target as Konva.Group, { x: event.target.x(), y: event.target.y() })}>
    <Rect width={item.width} height={item.height} fill="#ede6da" stroke={selected ? '#4779b8' : '#4d463d'} strokeWidth={selected ? 3 : 1} shadowColor="rgba(45,35,22,.2)" shadowBlur={8} shadowOffsetY={4} />
    <Text x={12} y={11} width={item.width - 24} text={`TYPE PRESSURE / ${isHeadline ? 'HEADLINE' : 'BODY'}`} fontFamily="IBM Plex Mono" fontSize={8} fill="#a05040" />
    <Text x={12} y={30} width={item.width - 24} height={item.height - 64} text={specimen} fontFamily={family} fontSize={isHeadline ? 34 : 16} lineHeight={isHeadline ? .86 : 1.35} fill="#171717" wrap="word" />
    <Text x={12} y={item.height - 29} width={item.width - 24} text={`${familyLabel.toUpperCase()} · ${candidate ? 'APPROVED' : 'AWAITING DIRECTION'}`} fontFamily="IBM Plex Mono" fontSize={8} fill="#554a3d" />
    <Text x={12} y={item.height - 17} width={item.width - 24} text={item.locked ? 'LOCKED' : 'SELECT · MOVE · RESIZE'} fontFamily="IBM Plex Mono" fontSize={7} fill="#4779b8" />
  </Group>
}
