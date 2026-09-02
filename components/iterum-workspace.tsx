'use client'

import { useWorkspaceSnapshot } from '../hooks/use-workspace-snapshot'
import { useWebMcpTools } from '../hooks/use-webmcp-tools'
import { useWebClipIntake } from '../hooks/use-web-clip-intake'
import { demoRuntime } from '../lib/domain/demo-runtime'
import type { WorkspaceRuntime } from '../lib/domain/workspace-runtime'
import type { Point, Proposal } from '../lib/domain/types'
import { useUiStore } from '../stores/ui-store'
import { BottomModeBar } from './bottom-mode-bar'
import { CampaignJobTicket } from './campaign-job-ticket'
import { ColorStudio } from './color-studio'
import { TopToolbar } from './top-toolbar'
import { BoardOutline } from './mechanical/board-outline'
import { MechanicalCanvas } from './mechanical/mechanical-canvas-loader'
import { MechanicalToolbar } from './mechanical/mechanical-toolbar'
import { useContainerSize } from '../hooks/use-container-size'
import { useEffect, useRef } from 'react'
import { ActionReceipt } from './review/action-receipt'
import { ReviewTray } from './review/review-tray'
import { TypographyStudio } from './typography/typography-studio'
import { useTypefaceStylesheet } from './typography/typeface-sample'

const PLACEMENT_SIZE = { width: 224, height: 286 }

/** Keeps human-approved proposal placement inside the measured mechanical viewport. */
export function proposalPlacementForViewport(width: number, height: number): Point {
  const safeWidth = Math.max(width, PLACEMENT_SIZE.width + 48)
  const safeHeight = Math.max(height, PLACEMENT_SIZE.height + 48)
  return {
    x: Math.max(24, Math.min(safeWidth - PLACEMENT_SIZE.width - 24, Math.round(safeWidth * 0.68))),
    y: Math.max(24, Math.min(safeHeight - PLACEMENT_SIZE.height - 24, 120)),
  }
}

function PlacementProjection({ proposal, placement }: { proposal: Proposal; placement: Point }) {
  return <figure className="placement-projection is-preview" data-testid="proposal-placement" data-placement={`X ${placement.x} · Y ${placement.y}`} style={{ left: placement.x, top: placement.y, width: PLACEMENT_SIZE.width, height: PLACEMENT_SIZE.height }}>
    {proposal.imageUrl ? <img src={proposal.imageUrl} alt={`${proposal.title} destination preview`} /> : <div className="placement-projection-missing">Preview unavailable</div>}
    <figcaption>{`Destination preview · X ${placement.x} · Y ${placement.y}`}</figcaption>
  </figure>
}

export function IterumWorkspace({ runtime }: { runtime?: WorkspaceRuntime }) {
  const workspaceRuntime = runtime ?? demoRuntime
  const snapshot = useWorkspaceSnapshot(workspaceRuntime)
  useWebMcpTools(workspaceRuntime)
  useWebClipIntake(workspaceRuntime)
  const activeTool = useUiStore((state) => state.activeTool)
  const setActiveTool = useUiStore((state) => state.setActiveTool)
  const setActiveRightTab = useUiStore((state) => state.setActiveRightTab)
  const selectedBoardItemId = useUiStore((state) => state.selectedBoardItemId)
  const boardViewport = useUiStore((state) => state.boardViewport)
  const previewLayoutProposalId = useUiStore((state) => state.previewLayoutProposalId)
  const selectBoardItem = useUiStore((state) => state.selectBoardItem)
  const isBriefDrawerOpen = useUiStore((state) => state.isBriefDrawerOpen)
  const isReviewDrawerOpen = useUiStore((state) => state.isReviewDrawerOpen)
  const setBriefDrawerOpen = useUiStore((state) => state.setBriefDrawerOpen)
  const setReviewDrawerOpen = useUiStore((state) => state.setReviewDrawerOpen)
  const canvasHost = useRef<HTMLDivElement>(null)
  const briefTriggerRef = useRef<HTMLButtonElement>(null)
  const reviewTriggerRef = useRef<HTMLButtonElement>(null)
  const canvasSize = useContainerSize(canvasHost)
  const versionLabel = `V${String(snapshot.version).padStart(2, '0')}`
  const pendingProposal = snapshot.proposals.find((proposal) => proposal.id === 'proposal-resin' && proposal.status === 'pending')
  const pendingPlacement = proposalPlacementForViewport(canvasSize.width, canvasSize.height)
  const layoutPreview = snapshot.layoutProposals.find((proposal) => proposal.id === previewLayoutProposalId && proposal.status === 'pending')
  const selectedBoardItem = snapshot.boardItems.find((item) => item.id === selectedBoardItemId)
  useTypefaceStylesheet(snapshot.typeDirection?.headline)
  useTypefaceStylesheet(snapshot.typeDirection?.body)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(max-width: 760px)')
    const syncDrawerForViewport = () => {
      setBriefDrawerOpen(false)
      setReviewDrawerOpen(media.matches)
    }
    syncDrawerForViewport()
    media.addEventListener('change', syncDrawerForViewport)
    return () => media.removeEventListener('change', syncDrawerForViewport)
  }, [setBriefDrawerOpen, setReviewDrawerOpen])

  const closeBrief = () => {
    setBriefDrawerOpen(false)
    requestAnimationFrame(() => briefTriggerRef.current?.focus())
  }
  const closeReview = () => {
    setReviewDrawerOpen(false)
    requestAnimationFrame(() => reviewTriggerRef.current?.focus())
  }

  return (
    <div className={`workspace${isBriefDrawerOpen ? ' is-brief-drawer-open' : ''}${isReviewDrawerOpen ? ' is-review-drawer-open' : ''}`} data-testid="iterum-workspace">
      <TopToolbar
        onOpenBrief={() => { setReviewDrawerOpen(false); setBriefDrawerOpen(true) }}
        onOpenReview={() => { setBriefDrawerOpen(false); setReviewDrawerOpen(true) }}
        briefExpanded={isBriefDrawerOpen}
        reviewExpanded={isReviewDrawerOpen}
        briefTriggerRef={briefTriggerRef}
        reviewTriggerRef={reviewTriggerRef}
      />
      <div className="desk-zones">
        <CampaignJobTicket campaign={snapshot.campaign} version={snapshot.version} runtime={workspaceRuntime} onClose={closeBrief} />
        <main className="working-mechanical" aria-label="Working mechanical">
          <div className="mechanical-meta"><span>Mechanical</span><span>{snapshot.campaign.name.replace(/\s+/g, '_')}_directions_{versionLabel}</span><span>3 routes · single session</span></div>
          <MechanicalToolbar activeTool={activeTool} onToolChange={setActiveTool} boardItems={snapshot.boardItems} selectedItem={selectedBoardItem} onToggleSelectedLock={() => { if (selectedBoardItem) workspaceRuntime.dispatch({ type: 'set-board-item-lock', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', itemId: selectedBoardItem.id, locked: !selectedBoardItem.locked }) }} />
          {activeTool === 'color' && <ColorStudio snapshot={snapshot} runtime={workspaceRuntime} onClose={() => setActiveTool('select')} />}
          {activeTool === 'type' && <TypographyStudio snapshot={snapshot} runtime={workspaceRuntime} onClose={() => setActiveTool('select')} onProposed={() => { setActiveTool('select'); setActiveRightTab('review') }} />}
          <div className="ruler ruler-top" aria-hidden="true" />
          <section className="pasteboard" aria-label={`${snapshot.campaign.name} campaign board`}>
            <div className="mechanical-canvas-host" ref={canvasHost} aria-hidden="true">
              {canvasSize.width > 0 && canvasSize.height > 0 && <MechanicalCanvas snapshot={snapshot} runtime={workspaceRuntime} width={canvasSize.width} height={canvasSize.height} selectedId={selectedBoardItemId} onSelect={selectBoardItem} proposalPreview={pendingProposal ? { proposal: pendingProposal, position: pendingPlacement } : undefined} layoutPreview={layoutPreview} />}
            </div>
            <div className="board-overlay-world" style={{ transform: `translate(${boardViewport.x}px, ${boardViewport.y}px) scale(${boardViewport.scale})` }}>
              <div className="registration registration-a" aria-hidden="true" /><div className="registration registration-b" aria-hidden="true" />
              {pendingProposal && <PlacementProjection proposal={pendingProposal} placement={pendingPlacement} />}
            </div>
          </section>
          <BoardOutline snapshot={snapshot} runtime={workspaceRuntime} selectedId={selectedBoardItemId} onSelect={selectBoardItem} />
          <ActionReceipt receipt={snapshot.receipts[0]} runtime={workspaceRuntime} />
          <p className="board-preview-notice">Board preview · canvas editing continues on desktop</p>
        </main>
        <ReviewTray snapshot={snapshot} runtime={workspaceRuntime} onClose={closeReview} proposalPlacement={pendingPlacement} />
      </div>
      <BottomModeBar version={snapshot.version} />
    </div>
  )
}
