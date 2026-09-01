'use client'

import { useEffect, useState } from 'react'
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva'
import type Konva from 'konva'

import type { BoardItem } from '../../lib/domain/types'

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

export function ReferenceNode({ item, selected, onSelect, onDragEnd, nodeRef }: { item: BoardItem; selected: boolean; onSelect: () => void; onDragEnd: (position: { x: number; y: number }) => void; nodeRef: (node: Konva.Group | null) => void }) {
  const image = useImage(item.imageUrl)
  return <Group id={item.id} ref={nodeRef} x={item.position.x} y={item.position.y} width={item.width} height={item.height} draggable={!item.locked} onClick={onSelect} onTap={onSelect} onDragEnd={(event) => onDragEnd({ x: event.target.x(), y: event.target.y() })}>
    <Rect width={item.width} height={item.height} fill="#dfd8cc" stroke={selected ? '#4779b8' : '#4d463d'} strokeWidth={selected ? 3 : 1} />
    {image ? <KonvaImage image={image} x={10} y={10} width={item.width - 20} height={item.height - 47} crop={{ x: 0, y: 0, width: image.width, height: image.height }} /> : <Rect x={10} y={10} width={item.width - 20} height={item.height - 47} fill="#b3a590" />}
    {item.locked && <><Rect x={item.width - 24} y={item.height - 31} width={10} height={8} stroke="#171717" strokeWidth={1} /><Rect x={item.width - 22} y={item.height - 36} width={6} height={7} stroke="#171717" strokeWidth={1} cornerRadius={4} /></>}
    <Text x={10} y={item.height - 28} width={item.width - 40} text={`${item.title.toUpperCase()}  ${item.locked ? 'LOCKED' : 'EDITABLE'}`} fontSize={9} fontFamily="IBM Plex Mono" fill="#171717" />
  </Group>
}
