'use client'

import { useEffect, useState } from 'react'
import { LockKeyhole, Scissors, X } from 'lucide-react'

import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { Point, Proposal, WorkspaceState } from '../../lib/domain/types'
import { isolateImageBackground } from '../../lib/image/isolate-background'
import { useUiStore } from '../../stores/ui-store'
import { ProposalCard } from './proposal-card'
import { ActionReceipt } from './action-receipt'
import { ReferenceCapturePanel } from './reference-capture-panel'
import { ReferenceLibrary } from './reference-library'
import { TypeDirectionCard } from '../typography/type-direction-card'
import { DirectionDraftCard } from './direction-draft-card'

function proposalCommand(runtime: WorkspaceRuntime, snapshot: WorkspaceState, proposal: Proposal, type: 'approve-proposal' | 'reject-proposal', position?: Point) {
  return type === 'approve-proposal'
    ? runtime.dispatch({ type, campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', proposalId: proposal.id, position })
    : runtime.dispatch({ type, campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', proposalId: proposal.id })
}

export function ReviewTray({ snapshot, runtime, onClose, proposalPlacement }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime; onClose?: () => void; proposalPlacement?: Point }) {
  const activeRightTab = useUiStore((state) => state.activeRightTab)
  const setActiveRightTab = useUiStore((state) => state.setActiveRightTab)
  const webClipMessage = useUiStore((state) => state.webClipMessage)
  const setWebClipMessage = useUiStore((state) => state.setWebClipMessage)
  const previewLayoutProposalId = useUiStore((state) => state.previewLayoutProposalId)
  const setPreviewLayoutProposal = useUiStore((state) => state.setPreviewLayoutProposal)
  const [isPhone, setIsPhone] = useState(false)
  const [isolatingId, setIsolatingId] = useState<string | null>(null)
  const [isolationMessage, setIsolationMessage] = useState('')
  const pending = snapshot.proposals.filter((proposal) => proposal.status === 'pending')
  const pendingType = snapshot.typeProposals.filter((proposal) => proposal.status === 'pending')
  const pendingLayouts = snapshot.layoutProposals.filter((proposal) => proposal.status === 'pending')
  const policy = snapshot.placementPolicy
  const togglePolicy = () => runtime.dispatch({ type: 'set-placement-policy', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', placementPolicy: { allowAgentDirectPlacement: !policy.allowAgentDirectPlacement, directPlacementTerritory: 'Agent Additions' } })
  const isolateProposal = async (proposal: Proposal) => {
    if (!proposal.imageUrl) return
    setIsolatingId(proposal.id); setIsolationMessage(`Isolating ${proposal.title} locally…`)
    try {
      const isolation = await isolateImageBackground(proposal.imageUrl, 50)
      const result = runtime.dispatch({ type: 'set-proposal-isolation', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', proposalId: proposal.id, isolation })
      setIsolationMessage(result.ok ? result.receipt.summary : result.error.message)
    } catch (error) { setIsolationMessage(error instanceof Error ? error.message : 'Local image isolation failed.') } finally { setIsolatingId(null) }
  }
  const restoreProposal = (proposal: Proposal) => {
    const result = runtime.dispatch({ type: 'set-proposal-isolation', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', proposalId: proposal.id, isolation: null })
    setIsolationMessage(result.ok ? result.receipt.summary : result.error.message)
  }
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(max-width: 760px)')
    const sync = () => setIsPhone(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  return <aside className="review-tray" id="review-tray" aria-label="Review tray">
    <div className="review-heading"><h2>Review tray</h2><span>{pending.length + pendingType.length + pendingLayouts.length} pending</span><button className="drawer-close" type="button" onClick={onClose}>Board preview</button></div>
    <div className="review-tabs" role="tablist" aria-label="Proposal galley views"><button role="tab" aria-selected={activeRightTab === 'review'} onClick={() => setActiveRightTab('review')}>Review</button><button role="tab" aria-selected={activeRightTab === 'capture'} onClick={() => setActiveRightTab('capture')}>Capture</button><button role="tab" aria-selected={activeRightTab === 'library'} onClick={() => setActiveRightTab('library')}>Library</button><button role="tab" aria-selected={activeRightTab === 'activity'} onClick={() => setActiveRightTab('activity')}>Activity</button></div>
    {webClipMessage && <section className="web-clip-notice" aria-label="Web clip status" aria-live="polite"><Scissors aria-hidden="true" /><p><strong>Browser clipper</strong>{webClipMessage}</p><button type="button" aria-label="Dismiss web clip status" onClick={() => setWebClipMessage(null)}><X aria-hidden="true" /></button></section>}
    {activeRightTab === 'review' ? <>
      <label className="placement-policy"><input type="checkbox" checked={policy.allowAgentDirectPlacement} onChange={togglePolicy} /><span><strong>Allow agent direct placement</strong><small>Restricted to Agent Additions territory.</small></span></label>
      {isolationMessage && <p className="isolation-status" aria-live="polite">{isolationMessage}</p>}
      {pending.length || pendingType.length || pendingLayouts.length ? <div className="proposal-list">{pendingLayouts.map((proposal) => <DirectionDraftCard key={proposal.id} proposal={proposal} snapshot={snapshot} isPreviewing={previewLayoutProposalId === proposal.id} onPreview={() => setPreviewLayoutProposal(previewLayoutProposalId === proposal.id ? null : proposal.id)} onApprove={() => { const result = runtime.dispatch({ type: 'review-board-layout', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', proposalId: proposal.id, decision: 'approve' }); if (result.ok) setPreviewLayoutProposal(null) }} onReject={() => { const result = runtime.dispatch({ type: 'review-board-layout', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', proposalId: proposal.id, decision: 'reject' }); if (result.ok) setPreviewLayoutProposal(null) }} />)}{pendingType.map((proposal) => <TypeDirectionCard key={proposal.id} proposal={proposal} onApprove={() => runtime.dispatch({ type: 'review-type-direction', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', proposalId: proposal.id, decision: 'approve' })} onReject={() => runtime.dispatch({ type: 'review-type-direction', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', proposalId: proposal.id, decision: 'reject' })} />)}{pending.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} placement={proposalPlacement} onApprove={() => proposalCommand(runtime, snapshot, proposal, 'approve-proposal', proposalPlacement)} onReject={() => proposalCommand(runtime, snapshot, proposal, 'reject-proposal')} onIsolate={() => isolateProposal(proposal)} onRestore={() => restoreProposal(proposal)} isIsolating={isolatingId === proposal.id} />)}</div> : <p className="activity-empty">No pending proposals. Use research to add sourced references or compose a reviewable Direction Draft.</p>}
    </> : activeRightTab === 'capture' ? <ReferenceCapturePanel snapshot={snapshot} runtime={runtime} onProposed={() => setActiveRightTab('review')} /> : activeRightTab === 'library' ? <ReferenceLibrary snapshot={snapshot} runtime={runtime} /> : <div className="activity-log">{snapshot.receipts.length ? snapshot.receipts.map((receipt) => <p key={receipt.id}><strong>V{String(receipt.version).padStart(2, '0')}</strong> {receipt.summary}</p>) : <p className="activity-empty">No agent activity has changed this mechanical.</p>}</div>}
    {isPhone && <div className="mobile-action-receipt"><ActionReceipt receipt={snapshot.receipts[0]} runtime={runtime} /></div>}
    <section className="agent-note"><h3>Review boundary</h3><p>Agent-found references and Direction Draft arrangements stay in review until you approve them.</p></section>
    <footer><LockKeyhole aria-hidden="true" />Designer review control</footer>
  </aside>
}
