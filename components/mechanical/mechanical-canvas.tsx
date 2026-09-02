'use client'

import { useEffect, useRef } from 'react'
import { Layer, Rect, Stage, Text, Transformer } from 'react-konva'
import type Konva from 'konva'

import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { BoardItem, Point, Proposal, WorkspaceState } from '../../lib/domain/types'
import { ReferenceNode } from './reference-node'

type RestorableNode = Pick<Konva.Group, 'x' | 'y' | 'width' | 'height' | 'scaleX' | 'scaleY' | 'getLayer' | 'remove'>

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

/** Reads the authoritative state after a rejected command, never the stale render closure. */
export function restoreNodeFromRuntime(node: RestorableNode, runtime: WorkspaceRuntime, itemId: string) {
  const currentItem = runtime.getSnapshot().boardItems.find((item) => item.id === itemId)
  if (currentItem) {
    restoreNodeFromItem(node, currentItem)
    return true
  }
  node.remove()
  node.getLayer()?.batchDraw()
  return false
}

export function MechanicalCanvas({ snapshot, runtime, width, height, selectedId, onSelect, proposalPreview }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime; width: number; height: number; selectedId: string | null; onSelect: (id: string | null) => void; proposalPreview?: { proposal: Proposal; position: Point } }) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const nodes = useRef(new Map<string, Konva.Group>())
  const selected = snapshot.boardItems.find((item) => item.id === selectedId)
  const rollback = (node: Konva.Group, itemId: string) => {
    if (!restoreNodeFromRuntime(node, runtime, itemId)) {
      nodes.current.delete(itemId)
      transformerRef.current?.nodes([])
      onSelect(null)
    }
  }
  useEffect(() => {
    const node = selectedId ? nodes.current.get(selectedId) : undefined
    if (transformerRef.current) transformerRef.current.nodes(node && selected && !selected.locked ? [node] : [])
  }, [selected, selectedId])
  const move = (item: BoardItem, node: Konva.Group, position: { x: number; y: number }) => {
    const result = runtime.dispatch({
      type: 'move-board-item', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version,
      idempotencyKey: crypto.randomUUID(), actor: 'designer', itemId: item.id, position,
    })
    if (!result.ok) rollback(node, item.id)
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
    if (!result.ok) rollback(node, selected.id)
    return result
  }
  return <Stage width={width} height={height} onMouseDown={(event) => { if (event.target === event.target.getStage()) onSelect(null) }}>
    <Layer>
      <Rect width={width} height={height} fill="#c8beaf" />
      <Text text="WORKING MECHANICAL · 48 × 72 IN · 300 DPI" x={22} y={18} fontFamily="IBM Plex Mono" fontSize={10} fill="#171717" />
      {proposalPreview && <><Rect x={proposalPreview.position.x} y={proposalPreview.position.y} width={224} height={286} stroke="#4779b8" strokeWidth={2} dash={[8, 5]} fill="rgba(71,121,184,0.08)" /><Text text={`DESTINATION PREVIEW\n${proposalPreview.proposal.intendedTerritory}`} x={proposalPreview.position.x + 10} y={proposalPreview.position.y + 10} fontFamily="IBM Plex Mono" fontSize={9} fill="#4779b8" /></>}
      {snapshot.boardItems.map((item) => <ReferenceNode key={item.id} item={item} selected={item.id === selectedId} onSelect={() => onSelect(item.id)} onDragEnd={(node, position) => move(item, node, position)} nodeRef={(node) => { if (node) nodes.current.set(item.id, node); else nodes.current.delete(item.id) }} />)}
      <Transformer ref={transformerRef} rotateEnabled={false} enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} onTransformEnd={bakeTransform} />
    </Layer>
  </Stage>
}
