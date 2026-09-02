'use client'

import type { Point, Proposal } from '../../lib/domain/types'

export function ProposalCard({ proposal, placement, onApprove, onReject }: { proposal: Proposal; placement?: Point; onApprove: () => void; onReject: () => void }) {
  return <article className="proposal-sheet" aria-label={`Proposal: ${proposal.title}`}>
    {proposal.imageUrl ? <img src={proposal.imageUrl} alt={proposal.title} /> : <div className="proposal-preview-missing">Preview unavailable</div>}
    <div>
      <p className="proposal-number">Pending proposal · target: {proposal.intendedTerritory}</p>
      <h3>{proposal.title}</h3>
      <dl>
        <dt>Source page</dt><dd><a href={proposal.sourceUrl} target="_blank" rel="noreferrer">{proposal.sourceUrl}</a></dd>
        <dt>Attribution</dt><dd>{proposal.attribution}</dd>
        <dt>Rights</dt><dd className={`rights-${proposal.rightsStatus}`}>{proposal.rightsStatus}</dd>
        <dt>Rationale</dt><dd>{proposal.rationale}</dd>
        <dt>Placement</dt><dd>{placement ? `Preview → ${proposal.intendedTerritory} · X ${placement.x} · Y ${placement.y}` : `Preview → ${proposal.intendedTerritory}`}</dd>
      </dl>
      <div className="proposal-actions"><button type="button" onClick={onReject}>Reject</button><button type="button" className="approve" onClick={onApprove}>Approve to {proposal.intendedTerritory}</button></div>
    </div>
  </article>
}
