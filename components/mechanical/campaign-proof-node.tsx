'use client'

import { useEffect, useState } from 'react'
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva'
import type Konva from 'konva'

import type { BoardItem, Campaign, TypeDirection } from '../../lib/domain/types'
import { fontFamilyFor } from '../typography/typeface-sample'

function useProofImage(url?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!url) return
    const next = new window.Image()
    next.src = url
    next.onload = () => setImage(next)
  }, [url])
  return image
}

export function CampaignProofNode({ item, campaign, direction, selected, panEnabled, presentation = false, onSelect, onDragEnd, nodeRef }: {
  item: BoardItem
  campaign: Campaign
  direction: TypeDirection | null
  selected: boolean
  panEnabled: boolean
  presentation?: boolean
  onSelect: () => void
  onDragEnd: (node: Konva.Group, position: { x: number; y: number }) => void
  nodeRef: (node: Konva.Group | null) => void
}) {
  const image = useProofImage(item.imageUrl)
  const padding = Math.max(16, item.width * .06)
  const headlineFamily = fontFamilyFor(direction?.headline) ?? 'Barlow Condensed'
  const headlineSize = Math.max(30, Math.min(78, item.width * .17))
  const headline = (direction?.specimenText || 'The air remembers.').replace(/ remembers\.?$/i, ' re-\nmembers.')

  return <Group id={item.id} ref={nodeRef} x={item.position.x} y={item.position.y} width={item.width} height={item.height} draggable={!item.locked && !panEnabled} onClick={onSelect} onTap={onSelect} onDragEnd={(event) => onDragEnd(event.target as Konva.Group, { x: event.target.x(), y: event.target.y() })}>
    <Rect width={item.width} height={item.height} fill="#bba885" stroke={selected ? '#4779b8' : '#4d463d'} strokeWidth={selected ? 4 : 1} shadowColor="rgba(45,35,22,.28)" shadowBlur={16} shadowOffsetY={8} />
    <Rect x={11} y={11} width={Math.max(1, item.width - 22)} height={Math.max(1, item.height - 22)} stroke="rgba(23,23,23,.28)" strokeWidth={1} />
    <Text x={padding} y={padding} width={item.width - padding * 2} text="I T E R U M" align="right" fontFamily="IBM Plex Mono" fontSize={11} fill="#a05040" />
    <Text x={padding} y={padding + 22} width={item.width - padding * 2} text={campaign.name.toUpperCase()} align="right" fontFamily="IBM Plex Mono" fontSize={9} fill="#a05040" />
    <Text x={padding} y={Math.max(72, item.height * .15)} width={item.width * .66} text={headline} fontFamily={headlineFamily} fontStyle="bold" fontSize={headlineSize} lineHeight={.78} fill="#171717" />
    {image ? <KonvaImage image={image} x={item.width * .38} y={item.height * .18} width={item.width * .58} height={item.height * .68} opacity={.78} globalCompositeOperation="multiply" /> : <Rect x={item.width * .38} y={item.height * .18} width={item.width * .58} height={item.height * .68} fill="rgba(160,80,64,.18)" />}
    <Text x={item.width * .65} y={item.height * .69} width={item.width * .27} text={campaign.creativeBrief.tone.map((tone) => tone.toUpperCase()).join('\n')} fontFamily="IBM Plex Mono" fontSize={8} lineHeight={1.45} fill="#a05040" />
    <Text x={padding} y={item.height - 37} width={item.width - padding * 2} text={`ITERUM.COM     ${campaign.line.toUpperCase()}`} fontFamily="IBM Plex Mono" fontSize={7} fill="#a05040" />
    {!presentation && <Text x={padding} y={item.height - 22} width={item.width - padding * 2} text={item.locked ? 'CAMPAIGN PROOF · LOCKED' : 'CAMPAIGN PROOF · SELECT · MOVE · RESIZE'} fontFamily="IBM Plex Mono" fontSize={7} fill={selected ? '#315f98' : '#6e463a'} />}
  </Group>
}
