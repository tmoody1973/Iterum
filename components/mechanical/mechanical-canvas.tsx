'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Layer, Rect, Stage, Text, Transformer } from 'react-konva'
import Konva from 'konva'

import { boundsForItems, fitBounds, zoomAtPoint } from '../../lib/board/viewport'
import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { BoardItem, BoardLayoutProposal, Point, Proposal, WorkspaceState } from '../../lib/domain/types'
import { useUiStore } from '../../stores/ui-store'
import { ReferenceNode } from './reference-node'
import { TypeSpecimenNode } from './type-specimen-node'
import { NoteNode } from './note-node'
import { BoardGroupOutlines, LayoutGhostPreview } from './layout-ghost-preview'
import { CampaignProofNode } from './campaign-proof-node'
import { ColorStripNode } from './color-strip-node'

Konva.hitOnDragEnabled = true

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

export function MechanicalCanvas({ snapshot, runtime, width, height, selectedId, onSelect, proposalPreview, layoutPreview }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime; width: number; height: number; selectedId: string | null; onSelect: (id: string | null) => void; proposalPreview?: { proposal: Proposal; position: Point }; layoutPreview?: BoardLayoutProposal }) {
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const nodes = useRef(new Map<string, Konva.Group>())
  const panGesture = useRef<{ pointer: Point; origin: Point } | null>(null)
  const pinchGesture = useRef<{ center: Point; distance: number } | null>(null)
  const [panModifier, setPanModifier] = useState(false)
  const viewport = useUiStore((state) => state.boardViewport)
  const viewportMode = useUiStore((state) => state.boardViewportMode)
  const viewportReady = useUiStore((state) => state.isBoardViewportReady)
  const setViewport = useUiStore((state) => state.setBoardViewport)
  const setViewportSize = useUiStore((state) => state.setBoardViewportSize)
  const boardBounds = useMemo(() => boundsForItems(snapshot.boardItems, true), [snapshot.boardItems])
  const campaignColors = snapshot.colorPalette.extraction?.colors.map((color) => color.hex)
    ?? (snapshot.colorPalette.pinned.length ? snapshot.colorPalette.pinned.map((color) => color.hex) : ['#c72b58', '#171717', '#4779b8', '#d18a0e', '#ead33e', '#a05040', '#217a3a', '#a0b9c1', '#d0c7ba', '#554a3d'])
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
  useEffect(() => {
    setViewportSize({ width, height })
    if (!viewportReady || viewportMode === 'fit') setViewport(fitBounds(boardBounds, { width, height }), 'fit')
  }, [boardBounds, height, setViewport, setViewportSize, viewportMode, viewportReady, width])
  useEffect(() => {
    const isInteractiveTarget = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, button, a, [contenteditable="true"]'))
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isInteractiveTarget(event.target)) return
      event.preventDefault()
      setPanModifier(true)
    }
    const up = (event: KeyboardEvent) => { if (event.code === 'Space') setPanModifier(false) }
    const cancelPan = () => { setPanModifier(false); panGesture.current = null }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', cancelPan)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', cancelPan) }
  }, [])
  useEffect(() => {
    const container = stageRef.current?.container()
    if (container) container.style.cursor = panGesture.current ? 'grabbing' : panModifier ? 'grab' : 'default'
  }, [panModifier, viewport])
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
  const startMousePan = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const native = event.evt
    if (native.button === 1 || (native.button === 0 && panModifier)) {
      native.preventDefault()
      panGesture.current = { pointer: { x: native.clientX, y: native.clientY }, origin: { x: viewport.x, y: viewport.y } }
      const container = stageRef.current?.container(); if (container) container.style.cursor = 'grabbing'
      return
    }
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (event.target === event.target.getStage()) onSelect(null)
  }
  const moveMousePan = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const gesture = panGesture.current
    if (!gesture) return
    event.evt.preventDefault()
    setViewport({ ...viewport, x: gesture.origin.x + event.evt.clientX - gesture.pointer.x, y: gesture.origin.y + event.evt.clientY - gesture.pointer.y }, 'custom')
  }
  const endMousePan = () => {
    panGesture.current = null
    const container = stageRef.current?.container(); if (container) container.style.cursor = panModifier ? 'grab' : 'default'
  }
  const wheelZoom = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const pointer = stageRef.current?.getPointerPosition()
    if (!pointer) return
    const current = useUiStore.getState().boardViewport
    setViewport(zoomAtPoint(current, current.scale * Math.exp(-event.evt.deltaY * .0015), pointer), 'custom')
  }
  const pinchZoom = (event: Konva.KonvaEventObject<TouchEvent>) => {
    if (event.evt.touches.length !== 2) return
    event.evt.preventDefault()
    const rect = stageRef.current?.container().getBoundingClientRect()
    if (!rect) return
    const [a, b] = [event.evt.touches[0], event.evt.touches[1]]
    const first = { x: a.clientX - rect.left, y: a.clientY - rect.top }
    const second = { x: b.clientX - rect.left, y: b.clientY - rect.top }
    const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
    const distance = Math.hypot(second.x - first.x, second.y - first.y)
    const previous = pinchGesture.current
    if (previous) {
      const current = useUiStore.getState().boardViewport
      const next = zoomAtPoint(current, current.scale * distance / Math.max(1, previous.distance), center)
      setViewport({ ...next, x: next.x + center.x - previous.center.x, y: next.y + center.y - previous.center.y }, 'custom')
    }
    pinchGesture.current = { center, distance }
  }
  return <Stage ref={stageRef} width={width} height={height} onWheel={wheelZoom} onMouseDown={startMousePan} onMouseMove={moveMousePan} onMouseUp={endMousePan} onMouseLeave={endMousePan} onTouchMove={pinchZoom} onTouchEnd={() => { pinchGesture.current = null }}>
    <Layer listening={false}>
      <Rect width={width} height={height} fill="#c8beaf" />
    </Layer>
    <Layer x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
      <Text text="WORKING MECHANICAL · 48 × 72 IN · 300 DPI" x={22} y={18} fontFamily="IBM Plex Mono" fontSize={10} fill="#171717" />
      {proposalPreview && <><Rect x={proposalPreview.position.x} y={proposalPreview.position.y} width={224} height={286} stroke="#4779b8" strokeWidth={2} dash={[8, 5]} fill="rgba(71,121,184,0.08)" /><Text text={`DESTINATION PREVIEW\n${proposalPreview.proposal.intendedTerritory}`} x={proposalPreview.position.x + 10} y={proposalPreview.position.y + 10} fontFamily="IBM Plex Mono" fontSize={9} fill="#4779b8" /></>}
      <BoardGroupOutlines snapshot={snapshot} />
      {snapshot.boardItems.map((item) => item.kind === 'type-specimen'
        ? <TypeSpecimenNode key={item.id} item={item} direction={snapshot.typeDirection} selected={item.id === selectedId} panEnabled={panModifier} onSelect={() => onSelect(item.id)} onDragEnd={(node, position) => move(item, node, position)} nodeRef={(node) => { if (node) nodes.current.set(item.id, node); else nodes.current.delete(item.id) }} />
        : item.kind === 'campaign-proof'
          ? <CampaignProofNode key={item.id} item={item} campaign={snapshot.campaign} direction={snapshot.typeDirection} selected={item.id === selectedId} panEnabled={panModifier} onSelect={() => onSelect(item.id)} onDragEnd={(node, position) => move(item, node, position)} nodeRef={(node) => { if (node) nodes.current.set(item.id, node); else nodes.current.delete(item.id) }} />
        : item.kind === 'color-strip'
          ? <ColorStripNode key={item.id} item={item} colors={campaignColors} selected={item.id === selectedId} panEnabled={panModifier} onSelect={() => onSelect(item.id)} onDragEnd={(node, position) => move(item, node, position)} nodeRef={(node) => { if (node) nodes.current.set(item.id, node); else nodes.current.delete(item.id) }} />
        : item.kind === 'note'
          ? <NoteNode key={item.id} item={item} selected={item.id === selectedId} panEnabled={panModifier} onSelect={() => onSelect(item.id)} onDragEnd={(node, position) => move(item, node, position)} nodeRef={(node) => { if (node) nodes.current.set(item.id, node); else nodes.current.delete(item.id) }} />
        : <ReferenceNode key={item.id} item={item} selected={item.id === selectedId} panEnabled={panModifier} onSelect={() => onSelect(item.id)} onDragEnd={(node, position) => move(item, node, position)} nodeRef={(node) => { if (node) nodes.current.set(item.id, node); else nodes.current.delete(item.id) }} />)}
      {layoutPreview && <LayoutGhostPreview snapshot={snapshot} proposal={layoutPreview} />}
      <Transformer ref={transformerRef} rotateEnabled={false} enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} onTransformEnd={bakeTransform} />
    </Layer>
  </Stage>
}
