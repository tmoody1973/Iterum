'use client'

import { Search, Tags } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { BoardItem, Proposal, ReferenceTargetType, TagSuggestion, WorkspaceState } from '../../lib/domain/types'

type LibraryEntry = {
  targetType: ReferenceTargetType
  id: string
  title: string
  imageUrl?: string
  attribution?: string
  territory: string
  tags: string[]
  suggestions: TagSuggestion[]
  state: 'on board' | 'in review'
  provider?: string
}

function entryFromBoard(item: BoardItem): LibraryEntry {
  return { targetType: 'board-item', id: item.id, title: item.title, imageUrl: item.imageUrl, attribution: item.attribution, territory: item.territory, tags: item.tags ?? [], suggestions: item.tagSuggestions ?? [], state: 'on board', provider: item.captureProvider }
}

function entryFromProposal(item: Proposal): LibraryEntry {
  return { targetType: 'proposal', id: item.id, title: item.title, imageUrl: item.isolation?.imageDataUrl ?? item.imageUrl, attribution: item.attribution, territory: item.intendedTerritory, tags: item.tags ?? [], suggestions: item.tagSuggestions ?? [], state: 'in review', provider: item.captureProvider }
}

export function ReferenceLibrary({ snapshot, runtime }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime }) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'all' | 'on board' | 'in review'>('all')
  const [message, setMessage] = useState('Search titles, territories, sources, and approved tags.')
  const entries = useMemo(() => [...snapshot.boardItems.map(entryFromBoard), ...snapshot.proposals.filter((proposal) => proposal.status === 'pending').map(entryFromProposal)], [snapshot])
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matches = entries.filter((entry) => {
    if (scope !== 'all' && entry.state !== scope) return false
    if (!normalizedQuery) return true
    return [entry.title, entry.attribution, entry.territory, entry.provider, ...entry.tags, ...entry.suggestions.flatMap((suggestion) => suggestion.tags)].filter(Boolean).join(' ').toLocaleLowerCase().includes(normalizedQuery)
  })

  const reviewSuggestion = (entry: LibraryEntry, suggestion: TagSuggestion, decision: 'approve' | 'reject') => {
    const result = runtime.dispatch({ type: 'review-reference-tags', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', targetType: entry.targetType, referenceId: entry.id, suggestionId: suggestion.id, decision })
    setMessage(result.ok ? result.receipt.summary : result.error.message)
  }

  return <div className="reference-library">
    <div className="library-search"><label><Search aria-hidden="true" />Search library<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="violet, industrial, type…" /></label><label>Scope<select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}><option value="all">All references</option><option value="on board">On board</option><option value="in review">In review</option></select></label></div>
    <p className="library-status" aria-live="polite"><span>{matches.length} of {entries.length}</span>{message}</p>
    <div className="library-results">{matches.map((entry) => <article key={`${entry.targetType}-${entry.id}`} className="library-entry">
      {entry.imageUrl ? <img src={entry.imageUrl} alt={entry.title} /> : <div className="library-image-missing">No preview</div>}
      <div><p className="library-entry-state">{entry.state} · {entry.territory}</p><h3>{entry.title}</h3><small>{entry.attribution || 'Source attribution unavailable'}</small><div className="library-tags" aria-label={`Approved tags for ${entry.title}`}>{entry.tags.length ? entry.tags.map((tag) => <span key={tag}>{tag}</span>) : <em>Untagged</em>}</div></div>
      {entry.suggestions.filter((suggestion) => suggestion.status === 'pending').map((suggestion) => <section className="tag-suggestion" key={suggestion.id} aria-label={`Tag suggestion for ${entry.title}`}><p><Tags aria-hidden="true" />Agent suggestion</p><div>{suggestion.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><small>{suggestion.rationale}</small><footer><button type="button" onClick={() => reviewSuggestion(entry, suggestion, 'reject')}>Reject tags</button><button type="button" className="approve-tags" onClick={() => reviewSuggestion(entry, suggestion, 'approve')}>Approve tags</button></footer></section>)}
    </article>)}</div>
    {!matches.length && <p className="library-empty">No references match this search.</p>}
  </div>
}
