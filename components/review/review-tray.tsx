'use client'

import { useEffect, useState } from 'react'
import { LockKeyhole } from 'lucide-react'

import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { Proposal, WorkspaceState } from '../../lib/domain/types'
import { useUiStore } from '../../stores/ui-store'
import { ProposalCard } from './proposal-card'
import { ActionReceipt } from './action-receipt'

function proposalCommand(runtime: WorkspaceRuntime, snapshot: WorkspaceState, proposal: Proposal, type: 'approve-proposal' | 'reject-proposal') {
  return runtime.dispatch({ type, campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', proposalId: proposal.id })
}

export function ReviewTray({ snapshot, runtime, onClose }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime; onClose?: () => void }) {
  const activeRightTab = useUiStore((state) => state.activeRightTab)
  const setActiveRightTab = useUiStore((state) => state.setActiveRightTab)
  const [isPhone, setIsPhone] = useState(false)
  const pending = snapshot.proposals.filter((proposal) => proposal.status === 'pending')
  const policy = snapshot.placementPolicy
  const togglePolicy = () => runtime.dispatch({ type: 'set-placement-policy', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', placementPolicy: { allowAgentDirectPlacement: !policy.allowAgentDirectPlacement, directPlacementTerritory: 'Agent Additions' } })
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(max-width: 760px)')
    const sync = () => setIsPhone(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  return <aside className="review-tray" id="review-tray" aria-label="Review tray">
    <div className="review-heading"><h2>Review tray</h2><span>{pending.length} pending</span><button className="drawer-close" type="button" onClick={onClose}>Board preview</button></div>
    <div className="review-tabs" role="tablist" aria-label="Proposal galley views"><button role="tab" aria-selected={activeRightTab === 'review'} onClick={() => setActiveRightTab('review')}>Review</button><button role="tab" aria-selected={activeRightTab === 'activity'} onClick={() => setActiveRightTab('activity')}>Activity</button></div>
    {activeRightTab === 'review' ? <>
      <label className="placement-policy"><input type="checkbox" checked={policy.allowAgentDirectPlacement} onChange={togglePolicy} /><span><strong>Allow agent direct placement</strong><small>Restricted to Agent Additions territory.</small></span></label>
      {pending.length ? <div className="proposal-list">{pending.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} onApprove={() => proposalCommand(runtime, snapshot, proposal, 'approve-proposal')} onReject={() => proposalCommand(runtime, snapshot, proposal, 'reject-proposal')} />)}</div> : <p className="activity-empty">No pending proposals. Use research to add sourced references; direct additions remain limited to Agent Additions.</p>}
    </> : <div className="activity-log">{snapshot.receipts.length ? snapshot.receipts.map((receipt) => <p key={receipt.id}><strong>V{String(receipt.version).padStart(2, '0')}</strong> {receipt.summary}</p>) : <p className="activity-empty">No agent activity has changed this mechanical.</p>}</div>}
    {isPhone && <div className="mobile-action-receipt"><ActionReceipt receipt={snapshot.receipts[0]} runtime={runtime} /></div>}
    <section className="agent-note"><h3>Review boundary</h3><p>Agent-found references stay in review unless you explicitly grant direct placement.</p></section>
    <footer><LockKeyhole aria-hidden="true" />Designer review control</footer>
  </aside>
}
