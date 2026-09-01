'use client'

import { Check, LockKeyhole } from 'lucide-react'

import { useWorkspaceSnapshot } from '../hooks/use-workspace-snapshot'
import { useUiStore } from '../stores/ui-store'
import { BottomModeBar } from './bottom-mode-bar'
import { CampaignJobTicket } from './campaign-job-ticket'
import { TopToolbar } from './top-toolbar'

function BoardReference({ item }: { item: ReturnType<typeof useWorkspaceSnapshot>['boardItems'][number] }) {
  return <figure className="board-reference" style={{ left: `${item.position.x / 10}%`, top: `${item.position.y / 6.4}%` }}>
    {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
    <figcaption>{item.title}<span><LockKeyhole aria-hidden="true" />Locked</span></figcaption>
  </figure>
}

export function IterumWorkspace() {
  const snapshot = useWorkspaceSnapshot()
  const activeRightTab = useUiStore((state) => state.activeRightTab)
  const setActiveRightTab = useUiStore((state) => state.setActiveRightTab)
  const proposal = snapshot.proposals[0]
  const versionLabel = `V${String(snapshot.version).padStart(2, '0')}`

  return (
    <div className="workspace" data-testid="iterum-workspace">
      <TopToolbar />
      <div className="desk-zones">
        <CampaignJobTicket campaign={snapshot.campaign} version={snapshot.version} />
        <main className="working-mechanical" aria-label="Working mechanical">
          <div className="mechanical-meta"><span>Mechanical</span><span>Static_bloom_poster_48x72_{versionLabel}.indd</span><span>48 × 72 in · portrait · 300 dpi</span></div>
          <div className="ruler ruler-top" aria-hidden="true" />
          <section className="pasteboard" aria-label="Static Bloom campaign board">
            <div className="registration registration-a" aria-hidden="true" /><div className="registration registration-b" aria-hidden="true" />
            {snapshot.boardItems.map((item) => <BoardReference item={item} key={item.id} />)}
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
          <section className="approval-receipt" aria-label="Latest action receipt"><span className="receipt-check"><Check aria-hidden="true" /></span><p><strong>REF_02_CRUSHED_IRIS.TIF</strong> approved and placed on poster.<small>Placed at X: 25.14 in · Y: 14.28 in · Scale: 48% · Layer: IMG_REF_02</small></p><button type="button">Undo</button></section>
        </main>
        <aside className="review-tray" aria-label="Review tray">
          <div className="review-heading"><h2>Review tray</h2><span>{snapshot.proposals.length} proposal</span></div>
          <div className="review-tabs" role="tablist" aria-label="Proposal galley views"><button role="tab" aria-selected={activeRightTab === 'review'} onClick={() => setActiveRightTab('review')}>Review</button><button role="tab" aria-selected={activeRightTab === 'activity'} onClick={() => setActiveRightTab('activity')}>Activity</button></div>
          {activeRightTab === 'review' && proposal ? <article className="proposal-sheet"><img src={proposal.imageUrl} alt={proposal.title} /><div><p className="proposal-number">Proposal 01</p><h3>{proposal.title}</h3><dl><dt>Source</dt><dd>{proposal.sourceUrl}</dd><dt>By</dt><dd>{proposal.attribution}</dd><dt>Rationale</dt><dd>{proposal.rationale}</dd><dt>Rights</dt><dd className="rights-clear">{proposal.rightsStatus}</dd></dl><div className="proposal-actions"><button type="button">Reject</button><button type="button" className="approve">Approve</button></div></div></article> : <p className="activity-empty">No agent activity has changed this mechanical.</p>}
          <section className="agent-note"><h3>Agent notes</h3><p>All proposals remain rights-cleared and ready for designer review.</p></section>
          <footer><LockKeyhole aria-hidden="true" />Review locked</footer>
        </aside>
      </div>
      <BottomModeBar version={snapshot.version} />
    </div>
  )
}
