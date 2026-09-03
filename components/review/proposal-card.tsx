'use client'

import type { Point, Proposal } from '../../lib/domain/types'

export function ProposalCard({ proposal, placement, onApprove, onReject, onIsolate, onRestore, isIsolating }: { proposal: Proposal; placement?: Point; onApprove: () => void; onReject: () => void; onIsolate: () => void; onRestore: () => void; isIsolating?: boolean }) {
  return <article className="proposal-sheet" aria-label={`Proposal: ${proposal.title}`}>
    {proposal.imageUrl ? <img className={proposal.isolation ? 'is-isolated' : ''} src={proposal.isolation?.imageDataUrl ?? proposal.imageUrl} alt={proposal.title} /> : <div className="proposal-preview-missing">Preview unavailable</div>}
    <div>
      <p className="proposal-number">{proposal.generation ? 'Generated study' : 'Pending proposal'} · target: {proposal.intendedTerritory}</p>
      <h3>{proposal.title}</h3>
      <dl>
        <dt>{proposal.generation ? 'Generated asset' : 'Source page'}</dt><dd><a href={proposal.sourceUrl} target="_blank" rel="noreferrer">{proposal.generation ? `${proposal.generation.model} · V${proposal.generation.version}` : proposal.sourceUrl}</a></dd>
        <dt>Attribution</dt><dd>{proposal.attribution}</dd>
        <dt>Rights</dt><dd className={`rights-${proposal.rightsStatus}`}>{proposal.rightsStatus}</dd>
        {proposal.captureProvider && <><dt>Capture</dt><dd>{proposal.captureProvider}{proposal.crop ? ` · X${proposal.crop.x} Y${proposal.crop.y} W${proposal.crop.width} H${proposal.crop.height}` : ''}</dd></>}
        {proposal.generation && <><dt>Lineage</dt><dd>Run {proposal.generation.runKey} · {proposal.generation.width}×{proposal.generation.height}{proposal.generation.parentAssetKey ? ` · edit of ${proposal.generation.parentAssetKey}` : ''}</dd><dt>Typography</dt><dd>Raster image only · never canonical campaign type</dd></>}
        {proposal.isolation && <><dt>Isolation</dt><dd>Local matte · {Math.round(proposal.isolation.removedRatio * 100)}% removed</dd></>}
        <dt>Rationale</dt><dd>{proposal.rationale}</dd>
        <dt>Placement</dt><dd>{placement ? `Preview → ${proposal.intendedTerritory} · X ${placement.x} · Y ${placement.y}` : `Preview → ${proposal.intendedTerritory}`}</dd>
      </dl>
      <div className="proposal-derivative-actions">{proposal.isolation ? <button type="button" onClick={onRestore}>Use original</button> : <button type="button" disabled={!proposal.imageUrl || isIsolating} onClick={onIsolate}>{isIsolating ? 'Isolating…' : 'Isolate subject'}</button>}</div>
      <div className="proposal-actions"><button type="button" onClick={onReject}>Reject</button><button type="button" className="approve" onClick={onApprove}>Approve to {proposal.intendedTerritory}</button></div>
    </div>
  </article>
}
