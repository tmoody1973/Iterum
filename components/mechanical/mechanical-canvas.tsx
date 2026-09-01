'use client'

import { useEffect, useRef } from 'react'
import { Layer, Rect, Stage, Text, Transformer } from 'react-konva'
import type Konva from 'konva'

import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { BoardItem, WorkspaceState } from '../../lib/domain/types'
import { ReferenceNode } from './reference-node'

type RestorableNode = Pick<Konva.Group, 'x' | 'y' | 'width' | 'height' | 'scaleX' | 'scaleY' | 'getLayer'>

/** Reconciles an imperatively changed Konva node after a rejected canonical command. */
export function restoreNodeFromItem(node: RestorableNode, item: BoardItem) {
  node.x(item.position.x)
  node.y(item.position.y)
  node.width(item.width)
  node.height(item.height)
  node.scaleX(1)
  node.scaleY(1)
  node.getLayer()?.batchDraw()
}

export function MechanicalCanvas({ snapshot, runtime, width, height, selectedId, onSelect }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime; width: number; height: number; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const nodes = useRef(new Map<string, Konva.Group>())
  const selected = snapshot.boardItems.find((item) => item.id === selectedId)
  useEffect(() => {
    const node = selectedId ? nodes.current.get(selectedId) : undefined
    if (transformerRef.current) transformerRef.current.nodes(node && selected && !selected.locked ? [node] : [])
  }, [selected, selectedId])
  const move = (item: BoardItem, node: Konva.Group, position: { x: number; y: number }) => {
    const result = runtime.dispatch({
      type: 'move-board-item', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version,
      idempotencyKey: crypto.randomUUID(), actor: 'designer', itemId: item.id, position,
    })
    if (!result.ok) restoreNodeFromItem(node, item)
    return result
  }
  const bakeTransform = () => {
    const node = selectedId ? nodes.current.get(selectedId) : undefined
    if (!node || !selected) return
    const width = Math.max(5, node.width() * node.scaleX())
    const height = Math.max(5, node.height() * node.scaleY())
    node.scaleX(1)
    node.scaleY(1)
    const result = runtime.dispatch({
      type: 'resize-board-item', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version,
      idempotencyKey: crypto.randomUUID(), actor: 'designer', itemId: selectedId!, width, height,
    })
    if (!result.ok) restoreNodeFromItem(node, selected)
    return result
  }
  return <Stage width={width} height={height} onMouseDown={(event) => { if (event.target === event.target.getStage()) onSelect(null) }}>
    <Layer>
      <Rect width={width} height={height} fill="#c8beaf" />
      <Text text="WORKING MECHANICAL · 48 × 72 IN · 300 DPI" x={22} y={18} fontFamily="IBM Plex Mono" fontSize={10} fill="#171717" />
      {snapshot.boardItems.map((item) => <ReferenceNode key={item.id} item={item} selected={item.id === selectedId} onSelect={() => onSelect(item.id)} onDragEnd={(node, position) => move(item, node, position)} nodeRef={(node) => { if (node) nodes.current.set(item.id, node); else nodes.current.delete(item.id) }} />)}
      <Transformer ref={transformerRef} rotateEnabled={false} enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} onTransformEnd={bakeTransform} />
    </Layer>
  </Stage>
}
