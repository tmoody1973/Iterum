import type { CSSProperties } from 'react'
import { ArrowRight, Image, Type } from 'lucide-react'

import type { CreativeTerritoryMetadata, WorkspaceState } from '../../lib/domain/types'

export function CreativeTerritoryReview({ territory, snapshot }: { territory: CreativeTerritoryMetadata; snapshot: WorkspaceState }) {
  const itemTitle = (id: string) => snapshot.boardItems.find((item) => item.id === id)?.title ?? id
  const application = snapshot.boardItems.find((item) => item.id === territory.application.itemId)

  return <section className="creative-territory-review" aria-label="Creative territory system">
    <div className="territory-thesis"><span>{territory.mood} · {territory.density}</span><strong>{territory.thesis}</strong></div>
    <div className="territory-section"><h4>Hierarchy intent</h4><dl className="territory-hierarchy"><div><dt>Hero</dt><dd>{itemTitle(territory.hierarchy.heroItemId)}</dd></div><div><dt>Primary</dt><dd>{territory.hierarchy.primaryItemIds.map(itemTitle).join(' · ') || 'None'}</dd></div><div><dt>Supporting</dt><dd>{territory.hierarchy.supportingItemIds.map(itemTitle).join(' · ') || 'None'}</dd></div></dl></div>
    <div className="territory-section"><h4><Image aria-hidden="true" />Reference contributions</h4><ol>{territory.references.map((reference) => <li key={reference.itemId}><strong>{itemTitle(reference.itemId)}</strong><b>{reference.contribution.replace('-', ' ')}</b><span>{reference.annotation}</span></li>)}</ol></div>
    <div className="territory-section territory-type"><h4><Type aria-hidden="true" />Type relationship</h4><p><strong>{itemTitle(territory.typography.headlineItemId)}</strong><ArrowRight aria-hidden="true" /><strong>{itemTitle(territory.typography.bodyItemId)}</strong></p><span>{territory.typography.scaleRatio}:1 scale · {territory.typography.relationship}</span></div>
    <div className="territory-section"><h4>Campaign palette</h4><ul className="territory-palette">{territory.palette.map((swatch) => <li key={`${swatch.hex}-${swatch.role}`}><i style={{ '--territory-swatch': swatch.hex } as CSSProperties} /><strong>{swatch.name}</strong><span>{swatch.role} · {swatch.hex}</span></li>)}</ul></div>
    <div className="territory-section"><h4>Visual relationships</h4><ul className="territory-relationships">{territory.relationships.map((relationship, index) => <li key={`${relationship.fromItemId}-${relationship.toItemId}-${index}`}><b>{relationship.kind.replace('-', ' ')}</b><span>{itemTitle(relationship.fromItemId)} → {itemTitle(relationship.toItemId)}</span><small>{relationship.rationale}</small></li>)}</ul></div>
    <div className="territory-application"><div>{application?.imageUrl ? <img src={application.imageUrl} alt={`${territory.application.format} application preview`} /> : <span>Application preview unavailable</span>}</div><p><b>{territory.application.format}</b><strong>{application?.title ?? territory.application.itemId}</strong><span>{territory.application.caption}</span></p></div>
    <ul className="territory-signals" aria-label="Grouping signals">{territory.groupingSignals.map((signal) => <li key={signal}>{signal}</li>)}</ul>
  </section>
}
