'use client'

import { useEffect, useState } from 'react'
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva'
import type Konva from 'konva'

import type { BoardItem } from '../../lib/domain/types'

export function referenceFilename(item: BoardItem) {
  if (item.kind === 'type-specimen') return `${item.typeRole ?? 'TYPE'}_SPECIMEN`
  if (item.kind === 'note') return 'DIRECTION_NOTE'
  if (item.kind === 'campaign-proof') return 'CAMPAIGN_PROOF'
  if (item.kind === 'color-strip') return 'CAMPAIGN_COLOR_STRIP'
  const path = item.imageUrl?.split('/').pop()
  return (path ?? item.title).replace(/-/g, '_').toUpperCase()
}

export function referenceSourceClass(item: BoardItem) {
  if (item.kind === 'type-specimen') return 'APPROVED TYPE DIRECTION'
  if (item.kind === 'note') return 'DIRECTION DRAFT NOTE'
  if (item.kind === 'campaign-proof') return 'CANONICAL CAMPAIGN PROOF'
  if (item.kind === 'color-strip') return 'CANONICAL CAMPAIGN PALETTE'
  return item.kind === 'agent-addition' ? 'AGENT PROPOSAL' : item.sourceUrl === 'local-demo' ? 'LOCAL SYNTHETIC' : 'EXTERNAL REFERENCE'
}

function useImage(url?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!url) return
    const next = new window.Image()
    next.src = url
    next.onload = () => setImage(next)
  }, [url])
  return image
}

export function ReferenceNode({ item, selected, panEnabled, presentation = false, onSelect, onDragEnd, nodeRef }: { item: BoardItem; selected: boolean; panEnabled: boolean; presentation?: boolean; onSelect: () => void; onDragEnd: (node: Konva.Group, position: { x: number; y: number }) => void; nodeRef: (node: Konva.Group | null) => void }) {
  const image = useImage(item.imageUrl)
  return <Group id={item.id} ref={nodeRef} x={item.position.x} y={item.position.y} width={item.width} height={item.height} draggable={!item.locked && !panEnabled} onClick={onSelect} onTap={onSelect} onDragEnd={(event) => onDragEnd(event.target as Konva.Group, { x: event.target.x(), y: event.target.y() })}>
    <Rect width={item.width} height={item.height} fill="#dfd8cc" stroke={selected ? '#4779b8' : '#4d463d'} strokeWidth={selected ? 3 : 1} />
    {image ? <KonvaImage image={image} x={presentation ? 0 : 10} y={presentation ? 0 : 10} width={item.width - (presentation ? 0 : 20)} height={item.height - (presentation ? 0 : 63)} crop={{ x: 0, y: 0, width: image.width, height: image.height }} /> : <Rect x={10} y={10} width={item.width - 20} height={item.height - 63} fill="#b3a590" />}
    {!presentation && item.locked && <><Rect x={item.width - 24} y={item.height - 47} width={10} height={8} stroke="#171717" strokeWidth={1} /><Rect x={item.width - 22} y={item.height - 52} width={6} height={7} stroke="#171717" strokeWidth={1} cornerRadius={4} /></>}
    {!presentation && <>
    <Text x={10} y={item.height - 51} width={item.width - 40} text={`${item.title.toUpperCase()}  ${item.locked ? 'LOCKED' : 'EDITABLE'}`} fontSize={8} fontFamily="IBM Plex Mono" fill="#171717" />
    <Text x={10} y={item.height - 38} width={item.width - 20} text={referenceFilename(item)} fontSize={8} fontFamily="IBM Plex Mono" fill="#171717" />
    <Text x={10} y={item.height - 25} width={item.width - 20} text={referenceSourceClass(item)} fontSize={8} fontFamily="IBM Plex Mono" fill="#554a3d" /></>}
  </Group>
}
