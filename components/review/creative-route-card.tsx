'use client'

import { Check, Route, X } from 'lucide-react'
import type { CreativeRoute } from '../../lib/domain/types'

export function CreativeRouteCard({ route, onApprove, onReject }: { route: CreativeRoute; onApprove: () => void; onReject: () => void }) {
  return <article className="creative-route-card" aria-label={`Creative route: ${route.name}`}>
    <header><span><Route aria-hidden="true" />Creative route</span><b>{route.territory}</b></header>
    <h3>{route.name}</h3>
    <p>{route.thesis}</p>
    <div className="route-palette" aria-label="Route palette">{route.palette.map((color) => <i key={color} style={{ background: color }} title={color} />)}</div>
    <dl><dt>Type</dt><dd>{route.typography}</dd><dt>Image</dt><dd>{route.imageTreatment}</dd><dt>Composition</dt><dd>{route.compositionPrinciples.join(' · ')}</dd></dl>
    <footer><button type="button" aria-label={`Reject creative route ${route.name}`} onClick={onReject}><X aria-hidden="true" />Reject</button><button type="button" className="approve" aria-label={`Approve creative route ${route.name}`} onClick={onApprove}><Check aria-hidden="true" />Approve route</button></footer>
  </article>
}
