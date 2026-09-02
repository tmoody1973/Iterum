'use client'

import type { TypeDirectionProposal } from '../../lib/domain/types'
import { TypefaceSample } from './typeface-sample'

export function TypeDirectionCard({ proposal, onApprove, onReject }: { proposal: TypeDirectionProposal; onApprove: () => void; onReject: () => void }) {
  const referenceOnly = proposal.headline.referenceOnly || proposal.body.referenceOnly
  return <article className="type-proposal-sheet" aria-label={`Type direction: ${proposal.headline.family} and ${proposal.body.family}`}>
    <p>Pending type direction</p>
    <h3>{proposal.headline.family} <span>+</span> {proposal.body.family}</h3>
    <TypefaceSample candidate={proposal.headline} className="type-proposal-headline">{proposal.specimenText}</TypefaceSample>
    <TypefaceSample candidate={proposal.body} className="type-proposal-body">Ozone, crushed iris, mineral rain, warm concrete, skin.</TypefaceSample>
    <dl><dt>Headline</dt><dd>{proposal.headline.sourceLabel} · {proposal.headline.license}{proposal.headline.referenceUrl && <> · <a href={proposal.headline.referenceUrl} target="_blank" rel="noreferrer">Catalog</a></>}</dd><dt>Body</dt><dd>{proposal.body.sourceLabel} · {proposal.body.license}{proposal.body.referenceUrl && <> · <a href={proposal.body.referenceUrl} target="_blank" rel="noreferrer">Catalog</a></>}</dd><dt>Rationale</dt><dd>{proposal.rationale}</dd></dl>
    {referenceOnly && <strong className="type-reference-warning">Commercial reference only · no font files embedded</strong>}
    <div><button type="button" onClick={onReject}>Reject type</button><button type="button" className="approve" onClick={onApprove}>Approve type direction</button></div>
  </article>
}
