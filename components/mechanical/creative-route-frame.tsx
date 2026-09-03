'use client'

import { Group, Line, Rect, Text } from 'react-konva'
import type { CreativeRoute } from '../../lib/domain/types'

export function CreativeRouteFrame({ route, presentation = false }: { route: CreativeRoute; presentation?: boolean }) {
  if (route.status === 'rejected') return null
  const { position, width, height } = route.frame
  const approved = route.status === 'approved'
  return <Group x={position.x} y={position.y} listening={false}>
    <Rect width={width} height={height} fill={presentation ? '#ded8cc' : 'rgba(238,232,220,0.18)'} stroke={presentation ? '#857b6c' : approved ? '#217a3a' : '#4779b8'} strokeWidth={presentation ? 1 : 2} dash={presentation || approved ? undefined : [8, 5]} />
    {!presentation && <>
    <Rect y={-34} width={width} height={30} fill={approved ? 'rgba(33,122,58,0.94)' : 'rgba(23,23,23,0.9)'} />
    <Text text={`${approved ? 'APPROVED' : 'IN REVIEW'} · ${route.name.toUpperCase()}`} x={10} y={-27} width={width - 20} fontFamily="IBM Plex Mono" fontStyle="bold" fontSize={10} fill={approved ? '#f2eee5' : '#8cb4ed'} />
    <Line points={[14, height - 34, width - 14, height - 34]} stroke="rgba(23,23,23,.45)" strokeWidth={1} />
    {route.palette.map((color, index) => <Rect key={`${route.id}-${color}-${index}`} x={14 + index * 30} y={height - 25} width={25} height={11} fill={color} stroke="#171717" strokeWidth={0.5} />)}</>}
  </Group>
}
