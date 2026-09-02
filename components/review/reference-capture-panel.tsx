'use client'

import { useState, type FormEvent } from 'react'
import { Crop, ExternalLink, Link2, Search } from 'lucide-react'

import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { CropRect, WorkspaceState } from '../../lib/domain/types'
import type { CapturedReference, ReferenceSearchResponse, ReferenceSearchResult } from '../../lib/references/types'

const territories = ['Material tension', 'Floral artifact', 'Type pressure', 'Agent Additions']
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function CropEditor({ imageUrl, crop, onChange }: { imageUrl: string; crop: CropRect; onChange: (crop: CropRect) => void }) {
  const update = (key: keyof CropRect, value: number) => {
    const next = { ...crop, [key]: value }
    next.width = clamp(next.width, 10, 100 - next.x)
    next.height = clamp(next.height, 10, 100 - next.y)
    next.x = clamp(next.x, 0, 100 - next.width)
    next.y = clamp(next.y, 0, 100 - next.height)
    onChange(next)
  }
  return <section className="capture-crop-editor" aria-label="Crop captured reference">
    <div className="capture-image-stage">
      <img src={imageUrl} alt="Captured page preview for cropping" />
      <span className="capture-crop-frame" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }} />
    </div>
    <div className="capture-crop-controls">
      {(['x', 'y', 'width', 'height'] as const).map((key) => <label key={key}>{key}<input type="range" min={key === 'width' || key === 'height' ? 10 : 0} max={key === 'x' ? 100 - crop.width : key === 'y' ? 100 - crop.height : key === 'width' ? 100 - crop.x : 100 - crop.y} value={crop[key]} onChange={(event) => update(key, Number(event.target.value))} /><output>{crop[key]}%</output></label>)}
    </div>
  </section>
}

function propose(runtime: WorkspaceRuntime, snapshot: WorkspaceState, input: { id: string; title: string; imageUrl?: string; sourceUrl: string; attribution: string; rightsStatus: 'cleared' | 'reference-only' | 'uncertain'; rationale: string; territory: string; crop: CropRect; provider: 'microlink' | 'pexels' }) {
  return runtime.dispatch({
    type: 'propose-reference', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId,
    expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer',
    proposal: { id: input.id, title: input.title, imageUrl: input.imageUrl, sourceUrl: input.sourceUrl, attribution: input.attribution, rightsStatus: input.rightsStatus, rationale: input.rationale, intendedTerritory: input.territory, crop: input.crop, captureProvider: input.provider },
  })
}

export function ReferenceCapturePanel({ snapshot, runtime, onProposed }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime; onProposed: () => void }) {
  const [url, setUrl] = useState('')
  const [capture, setCapture] = useState<CapturedReference | null>(null)
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 100, height: 100 })
  const [territory, setTerritory] = useState('Material tension')
  const [query, setQuery] = useState('wet mineral surface')
  const [search, setSearch] = useState<ReferenceSearchResponse | null>(null)
  const [status, setStatus] = useState('Paste a public URL or search Pexels for licensed reference photography.')
  const [busy, setBusy] = useState<'capture' | 'search' | null>(null)

  const captureUrl = async (event: FormEvent) => {
    event.preventDefault(); setBusy('capture'); setStatus('Capturing page metadata and preview…')
    try {
      const response = await fetch(`/api/references/capture?url=${encodeURIComponent(url)}`)
      const payload = await response.json() as CapturedReference & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Capture failed.')
      setCapture(payload); setCrop(payload.crop); setStatus(`Captured ${payload.title}. Set the crop before review.`)
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Capture failed.') } finally { setBusy(null) }
  }

  const searchPexels = async (event: FormEvent) => {
    event.preventDefault(); setBusy('search'); setStatus('Searching licensed Pexels references…')
    try {
      const response = await fetch(`/api/references/search?q=${encodeURIComponent(query)}&count=8`)
      const payload = await response.json() as ReferenceSearchResponse & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Search failed.')
      setSearch(payload)
      setStatus(payload.configured ? `Found ${payload.results.length} Pexels references.` : payload.note || 'Pexels is not configured.')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Search failed.') } finally { setBusy(null) }
  }

  const addCapture = () => {
    if (!capture) return
    const result = propose(runtime, snapshot, { id: `capture-${crypto.randomUUID()}`, title: capture.title, imageUrl: capture.imageUrl, sourceUrl: capture.sourceUrl, attribution: capture.attribution, rightsStatus: capture.rightsStatus, rationale: capture.description, territory, crop, provider: 'microlink' })
    if (result.ok) onProposed(); else setStatus(result.error.message)
  }

  const addSearchResult = (item: ReferenceSearchResult) => {
    const result = propose(runtime, snapshot, { id: `${item.id}-${crypto.randomUUID()}`, title: item.title, imageUrl: item.imageUrl, sourceUrl: item.sourceUrl, attribution: item.attribution, rightsStatus: item.rightsStatus, rationale: `Licensed visual reference found for “${query}”.`, territory, crop: item.crop, provider: 'pexels' })
    if (result.ok) onProposed(); else setStatus(result.error.message)
  }

  return <div className="reference-capture-panel">
    <section className="capture-method">
      <h3><Link2 aria-hidden="true" />Capture URL</h3>
      <form onSubmit={captureUrl}><label>Public source URL<input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/reference" /></label><button type="submit" disabled={busy !== null}>{busy === 'capture' ? 'Capturing…' : 'Inspect URL'}</button></form>
      {capture && <article className="captured-reference">
        <header><span>{capture.previewKind} capture</span><a href={capture.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />Source</a></header>
        {capture.imageUrl ? <CropEditor imageUrl={capture.imageUrl} crop={crop} onChange={setCrop} /> : <p>No embeddable preview was found; source metadata can still enter review.</p>}
        <h4>{capture.title}</h4><p>{capture.description}</p>
        <div className="capture-submit-row"><label>Board territory<select value={territory} onChange={(event) => setTerritory(event.target.value)}>{territories.map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={addCapture}>Send to Review</button></div>
      </article>}
    </section>
    <section className="capture-method">
      <h3><Search aria-hidden="true" />Search Pexels</h3>
      <form onSubmit={searchPexels}><label>Reference query<input required minLength={2} value={query} onChange={(event) => setQuery(event.target.value)} /></label><button type="submit" disabled={busy !== null}>{busy === 'search' ? 'Searching…' : 'Search'}</button></form>
      {search && !search.configured && <p className="capture-provider-message">{search.note}</p>}
      {search?.results.length ? <div className="reference-search-results">{search.results.map((item) => <article key={item.id}><img src={item.thumbnailUrl} alt={item.title} /><p>{item.title}</p><small>{item.attribution}</small><button type="button" onClick={() => addSearchResult(item)}>Add to Review</button></article>)}</div> : null}
    </section>
    <p className="capture-status" aria-live="polite"><Crop aria-hidden="true" />{status}</p>
  </div>
}
