'use client'

import { useState, type FormEvent } from 'react'
import { Search, Type, X } from 'lucide-react'

import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { TypefaceCandidate, TypefaceCategory, WorkspaceState } from '../../lib/domain/types'
import type { TypefaceSearchResponse } from '../../lib/typefaces/types'
import { TypefaceSample } from './typeface-sample'

const categories: Array<TypefaceCategory | 'all'> = ['all', 'sans-serif', 'serif', 'display', 'monospace', 'handwriting']

export function TypographyStudio({ snapshot, runtime, onClose, onProposed }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime; onClose: () => void; onProposed: () => void }) {
  const [query, setQuery] = useState('fraunces')
  const [category, setCategory] = useState<TypefaceCategory | 'all'>('all')
  const [includeCommercial, setIncludeCommercial] = useState(false)
  const [results, setResults] = useState<TypefaceSearchResponse | null>(null)
  const [headline, setHeadline] = useState<TypefaceCandidate | null>(null)
  const [body, setBody] = useState<TypefaceCandidate | null>(null)
  const [rationale, setRationale] = useState('Tension between an expressive campaign voice and a disciplined editorial reading face.')
  const [status, setStatus] = useState('Search open-source faces, then assign a headline and body role.')
  const [busy, setBusy] = useState(false)

  const search = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setStatus('Searching verified font catalogs…')
    try {
      const params = new URLSearchParams({ q: query, category, includeCommercial: String(includeCommercial), count: '10' })
      const response = await fetch(`/api/typefaces/search?${params}`)
      const payload = await response.json() as TypefaceSearchResponse & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Typeface search failed.')
      setResults(payload); setStatus(`Found ${payload.results.length} typefaces. ${payload.note ?? ''}`.trim())
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Typeface search failed.') } finally { setBusy(false) }
  }

  const propose = () => {
    if (!headline || !body) return
    const result = runtime.dispatch({ type: 'propose-type-direction', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', proposal: { id: `type-${crypto.randomUUID()}`, headline, body, specimenText: 'The air remembers.', rationale } })
    if (result.ok) onProposed(); else setStatus(result.error.message)
  }

  return <section className="typography-studio" aria-label="Typography studio">
    <header className="type-studio-heading"><span><Type aria-hidden="true" />Typography study</span><button type="button" aria-label="Close typography studio" onClick={onClose}><X aria-hidden="true" /></button></header>
    <p className="type-studio-intro">Build a reviewable campaign pairing. Free faces render live; commercial faces remain labeled visual references.</p>
    <form className="type-search" onSubmit={search}>
      <label>Family or keyword<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fraunces" /></label>
      <label>Classification<select value={category} onChange={(event) => setCategory(event.target.value as TypefaceCategory | 'all')}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="commercial-toggle"><input type="checkbox" checked={includeCommercial} onChange={(event) => setIncludeCommercial(event.target.checked)} /><span>Include commercial faces <small>Reference-only recommendations</small></span></label>
      <button className="type-search-button" type="submit" disabled={busy}><Search aria-hidden="true" />{busy ? 'Searching…' : 'Search type'}</button>
    </form>
    <p className="type-studio-status" aria-live="polite">{status}</p>
    {results?.results.length ? <div className="type-results">{results.results.map((candidate) => <article key={candidate.id}>
      <div className="type-result-meta"><strong>{candidate.family}</strong><span>{candidate.category} · {candidate.sourceLabel}</span>{candidate.referenceOnly && <em>Reference only</em>}</div>
      <TypefaceSample candidate={candidate} className="type-result-sample">Aa / The air remembers.</TypefaceSample>
      <small>{candidate.license}{candidate.referenceUrl && <> · <a href={candidate.referenceUrl} target="_blank" rel="noreferrer">Catalog</a></>}</small>
      <div><button type="button" onClick={() => setHeadline(candidate)}>Headline</button><button type="button" onClick={() => setBody(candidate)}>Body</button></div>
    </article>)}</div> : null}
    {(headline || body) && <section className="type-comparison" aria-label="Type direction comparison">
      <p className="type-comparison-label">Direction proof</p>
      <div className="type-role"><span>Headline · {headline?.family ?? 'Unassigned'}</span>{headline && <TypefaceSample candidate={headline} className="type-headline-sample">The air remembers.</TypefaceSample>}</div>
      <div className="type-role"><span>Body · {body?.family ?? 'Unassigned'}</span>{body && <TypefaceSample candidate={body} className="type-body-sample">Ozone, crushed iris, mineral rain, warm concrete, skin.</TypefaceSample>}</div>
      <label>Pairing rationale<textarea value={rationale} maxLength={320} onChange={(event) => setRationale(event.target.value)} /></label>
      <button className="type-propose" type="button" disabled={!headline || !body || !rationale.trim()} onClick={propose}>Send type direction to review</button>
    </section>}
    {snapshot.typeDirection && <p className="type-approved">Approved · {snapshot.typeDirection.headline.family} + {snapshot.typeDirection.body.family}</p>}
  </section>
}
