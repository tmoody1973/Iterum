'use client'

import { useWorkspaceSnapshot } from '../hooks/use-workspace-snapshot'
import { useWebMcpTools } from '../hooks/use-webmcp-tools'
import { useWebClipIntake } from '../hooks/use-web-clip-intake'
import { demoRuntime } from '../lib/domain/demo-runtime'
import type { WorkspaceRuntime } from '../lib/domain/workspace-runtime'
import type { Point, Proposal, WorkspaceState } from '../lib/domain/types'
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
import { fontFamilyFor, useTypefaceStylesheet } from './typography/typeface-sample'

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

function PlacementProjection({ proposal, placement, item }: { proposal: Proposal; placement: Point; item?: WorkspaceState['boardItems'][number] }) {
  const committed = item?.position ?? placement
  const className = item ? 'placement-projection is-placed' : 'placement-projection is-preview'
  return <figure className={className} data-testid="proposal-placement" data-placement={`X ${committed.x} · Y ${committed.y}`} style={{ left: committed.x, top: committed.y, width: item?.width ?? PLACEMENT_SIZE.width, height: item?.height ?? PLACEMENT_SIZE.height }}>
    {proposal.imageUrl ? <img src={proposal.imageUrl} alt={`${proposal.title} ${item ? 'placed on the mechanical' : 'destination preview'}`} /> : <div className="placement-projection-missing">Preview unavailable</div>}
    <figcaption>{item ? `Waxed at X ${committed.x} · Y ${committed.y}` : `Destination preview · X ${committed.x} · Y ${committed.y}`}</figcaption>
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
  const placedProposalItem = snapshot.boardItems.find((item) => item.sourceProposalId === 'proposal-resin')
  const layoutPreview = snapshot.layoutProposals.find((proposal) => proposal.id === previewLayoutProposalId && proposal.status === 'pending')
  const extractedColors = snapshot.colorPalette.extraction?.colors.map((color) => color.hex) ?? []
  const pinnedColors = snapshot.colorPalette.pinned.map((color) => color.hex)
  const campaignColors = extractedColors.length > 0
    ? extractedColors
    : pinnedColors.length > 0
      ? pinnedColors
      : ['#c72b58', '#171717', '#4779b8', '#d18a0e', '#ead33e', '#a05040', '#217a3a', '#a0b9c1', '#d0c7ba', '#554a3d']
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
        <CampaignJobTicket campaign={snapshot.campaign} version={snapshot.version} onClose={closeBrief} />
        <main className="working-mechanical" aria-label="Working mechanical">
          <div className="mechanical-meta"><span>Mechanical</span><span>Static_bloom_poster_48x72_{versionLabel}.indd</span><span>48 × 72 in · portrait · 300 dpi</span></div>
          <MechanicalToolbar activeTool={activeTool} onToolChange={setActiveTool} boardItems={snapshot.boardItems} />
          {activeTool === 'color' && <ColorStudio snapshot={snapshot} runtime={workspaceRuntime} onClose={() => setActiveTool('select')} />}
          {activeTool === 'type' && <TypographyStudio snapshot={snapshot} runtime={workspaceRuntime} onClose={() => setActiveTool('select')} onProposed={() => { setActiveTool('select'); setActiveRightTab('review') }} />}
          <div className="ruler ruler-top" aria-hidden="true" />
          <section className="pasteboard" aria-label="Static Bloom campaign board">
            <div className="mechanical-canvas-host" ref={canvasHost} aria-hidden="true">
              {canvasSize.width > 0 && canvasSize.height > 0 && <MechanicalCanvas snapshot={snapshot} runtime={workspaceRuntime} width={canvasSize.width} height={canvasSize.height} selectedId={selectedBoardItemId} onSelect={selectBoardItem} proposalPreview={pendingProposal ? { proposal: pendingProposal, position: pendingPlacement } : undefined} layoutPreview={layoutPreview} />}
            </div>
            <div className="board-overlay-world" style={{ transform: `translate(${boardViewport.x}px, ${boardViewport.y}px) scale(${boardViewport.scale})` }}>
              <div className="registration registration-a" aria-hidden="true" /><div className="registration registration-b" aria-hidden="true" />
              <article className="poster-proof">
                <span className="tape tape-top" aria-hidden="true" />
                <p className="poster-brand">ITERUM</p><p className="poster-campaign">Static bloom</p>
                <h2 style={{ fontFamily: fontFamilyFor(snapshot.typeDirection?.headline) }}>The air re-<br />members.</h2>
                <img src="/assets/ref-resin-iris.webp" alt="Crushed iris in resin campaign proof" />
                <p className="poster-notes">ozone<br />crushed iris<br />mineral rain<br />warm concrete<br />skin</p>
                <p className="poster-footer">ITERUM.COM <span>The air remembers.</span></p>
                <span className="tape tape-bottom" aria-hidden="true" />
              </article>
              <div className="color-strip" aria-label="Campaign color control strip">{campaignColors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</div>
              {pendingProposal && <PlacementProjection proposal={pendingProposal} placement={pendingPlacement} />}
              {placedProposalItem && <PlacementProjection proposal={snapshot.proposals.find((proposal) => proposal.id === 'proposal-resin')!} placement={pendingPlacement} item={placedProposalItem} />}
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
