'use client'

import { useWorkspaceSnapshot } from '../hooks/use-workspace-snapshot'
import { useWebMcpTools } from '../hooks/use-webmcp-tools'
import { demoRuntime } from '../lib/domain/demo-runtime'
import type { WorkspaceRuntime } from '../lib/domain/workspace-runtime'
import { useUiStore } from '../stores/ui-store'
import { BottomModeBar } from './bottom-mode-bar'
import { CampaignJobTicket } from './campaign-job-ticket'
import { TopToolbar } from './top-toolbar'
import { BoardOutline } from './mechanical/board-outline'
import { MechanicalCanvas } from './mechanical/mechanical-canvas-loader'
import { MechanicalToolbar } from './mechanical/mechanical-toolbar'
import { useContainerSize } from '../hooks/use-container-size'
import { useEffect, useRef } from 'react'
import { ActionReceipt } from './review/action-receipt'
import { ReviewTray } from './review/review-tray'

export function IterumWorkspace({ runtime }: { runtime?: WorkspaceRuntime }) {
  const workspaceRuntime = runtime ?? demoRuntime
  const snapshot = useWorkspaceSnapshot(workspaceRuntime)
  useWebMcpTools(workspaceRuntime)
  const activeTool = useUiStore((state) => state.activeTool)
  const setActiveTool = useUiStore((state) => state.setActiveTool)
  const selectedBoardItemId = useUiStore((state) => state.selectedBoardItemId)
  const selectBoardItem = useUiStore((state) => state.selectBoardItem)
  const isBriefDrawerOpen = useUiStore((state) => state.isBriefDrawerOpen)
  const isReviewDrawerOpen = useUiStore((state) => state.isReviewDrawerOpen)
  const setBriefDrawerOpen = useUiStore((state) => state.setBriefDrawerOpen)
  const setReviewDrawerOpen = useUiStore((state) => state.setReviewDrawerOpen)
  const canvasHost = useRef<HTMLDivElement>(null)
  const canvasSize = useContainerSize(canvasHost)
  const versionLabel = `V${String(snapshot.version).padStart(2, '0')}`

  useEffect(() => {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 760px)').matches) setReviewDrawerOpen(true)
  }, [setReviewDrawerOpen])

  return (
    <div className={`workspace${isBriefDrawerOpen ? ' is-brief-drawer-open' : ''}${isReviewDrawerOpen ? ' is-review-drawer-open' : ''}`} data-testid="iterum-workspace">
      <TopToolbar
        onOpenBrief={() => { setReviewDrawerOpen(false); setBriefDrawerOpen(true) }}
        onOpenReview={() => { setBriefDrawerOpen(false); setReviewDrawerOpen(true) }}
      />
      <div className="desk-zones">
        <CampaignJobTicket campaign={snapshot.campaign} version={snapshot.version} onClose={() => setBriefDrawerOpen(false)} />
        <main className="working-mechanical" aria-label="Working mechanical">
          <div className="mechanical-meta"><span>Mechanical</span><span>Static_bloom_poster_48x72_{versionLabel}.indd</span><span>48 × 72 in · portrait · 300 dpi</span></div>
          <MechanicalToolbar activeTool={activeTool} onToolChange={setActiveTool} />
          <div className="ruler ruler-top" aria-hidden="true" />
          <section className="pasteboard" aria-label="Static Bloom campaign board">
            <div className="registration registration-a" aria-hidden="true" /><div className="registration registration-b" aria-hidden="true" />
            <div className="mechanical-canvas-host" ref={canvasHost} aria-hidden="true">
              {canvasSize.width > 0 && canvasSize.height > 0 && <MechanicalCanvas snapshot={snapshot} runtime={workspaceRuntime} width={canvasSize.width} height={canvasSize.height} selectedId={selectedBoardItemId} onSelect={selectBoardItem} />}
            </div>
            <article className="poster-proof">
              <span className="tape tape-top" aria-hidden="true" />
              <p className="poster-brand">ITERUM</p><p className="poster-campaign">Static bloom</p>
              <h2>The air re-<br />members.</h2>
              <img src="/assets/ref-resin-iris.webp" alt="Crushed iris in resin campaign proof" />
              <p className="poster-notes">ozone<br />crushed iris<br />mineral rain<br />warm concrete<br />skin</p>
              <p className="poster-footer">ITERUM.COM <span>The air remembers.</span></p>
              <span className="tape tape-bottom" aria-hidden="true" />
            </article>
            <div className="color-strip" aria-label="Campaign color control strip">{['#c72b58', '#171717', '#4779b8', '#d18a0e', '#ead33e', '#a05040', '#217a3a', '#a0b9c1', '#d0c7ba', '#554a3d'].map((color) => <i key={color} style={{ backgroundColor: color }} />)}</div>
          </section>
          <BoardOutline snapshot={snapshot} runtime={workspaceRuntime} selectedId={selectedBoardItemId} onSelect={selectBoardItem} />
          <ActionReceipt receipt={snapshot.receipts[0]} runtime={workspaceRuntime} />
          <p className="board-preview-notice">Board preview · canvas editing continues on desktop</p>
        </main>
        <ReviewTray snapshot={snapshot} runtime={workspaceRuntime} onClose={() => setReviewDrawerOpen(false)} />
      </div>
      <BottomModeBar version={snapshot.version} />
    </div>
  )
}
