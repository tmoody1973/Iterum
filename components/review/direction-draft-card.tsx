'use client'

import { Check, Eye, Grid3X3, Layers3, LockKeyhole, X } from 'lucide-react'

import type { BoardLayoutProposal, WorkspaceState } from '../../lib/domain/types'
import { CreativeTerritoryReview } from './creative-territory-review'

export function DirectionDraftCard({ proposal, snapshot, isPreviewing, onPreview, onApprove, onReject }: {
  proposal: BoardLayoutProposal
  snapshot: WorkspaceState
  isPreviewing: boolean
  onPreview: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const organization = proposal.organization
  const creativeTerritory = proposal.creativeTerritory
  const baselineVersion = creativeTerritory?.baselineBoardVersion ?? organization?.baselineBoardVersion
  const isStale = baselineVersion !== undefined && snapshot.version !== baselineVersion + 1
  const organizationScope = organization?.scope
  const organizationScopeLabel = organizationScope?.type === 'route' ? snapshot.creativeRoutes.find((route) => route.id === organizationScope.routeId)?.name ?? organizationScope.routeId
    : organizationScope?.type === 'territory' ? organizationScope.territory
      : organizationScope?.type === 'selection' ? `${organizationScope.itemIds.length} selected items`
        : 'Whole board'
  return <article className="direction-draft-card" aria-label={`Direction Draft: ${proposal.title}`}>
    <header><p>{organization ? <Grid3X3 aria-hidden="true" /> : <Layers3 aria-hidden="true" />}{creativeTerritory ? 'Creative territory' : organization ? 'Organization preview' : 'Direction Draft'}</p><span>{proposal.changes.length + proposal.notes.length} changes</span></header>
    <h3>{proposal.title}</h3>
    <p className="direction-draft-rationale">{proposal.rationale}</p>
    {creativeTerritory ? <CreativeTerritoryReview territory={creativeTerritory} snapshot={snapshot} /> : organization ? <div className="organization-review-details">
      <dl className="organization-review-meta"><div><dt>Scope</dt><dd>{organizationScopeLabel}</dd></div><div><dt>Grouped by</dt><dd>{organization.strategy}</dd></div><div><dt>Ranking</dt><dd>{organization.ranking.replace('-', ' ')}</dd></div></dl>
      <ol className="organization-group-list" aria-label="Proposed groups">{organization.groups.map((group) => <li key={group.id}><strong>{group.label}</strong><span>{group.itemIds.length} items · {Math.round(group.confidence * 100)}% confidence</span><small>{group.rationale}</small><ul>{organization.assignments.filter((assignment) => assignment.groupId === group.id).map((assignment) => <li key={assignment.itemId}><b>{assignment.role}</b>{snapshot.boardItems.find((item) => item.id === assignment.itemId)?.title ?? assignment.itemId}</li>)}</ul></li>)}</ol>
      {organization.untouchedLockedItemIds.length > 0 && <p className="organization-locked"><LockKeyhole aria-hidden="true" /><span><strong>{organization.untouchedLockedItemIds.length} protected {organization.untouchedLockedItemIds.length === 1 ? 'item remains' : 'items remain'} untouched</strong>{organization.untouchedLockedItemIds.map((id) => snapshot.boardItems.find((item) => item.id === id)?.title ?? id).join(' · ')}</span></p>}
      {organization.unresolvedItems.length > 0 && <section className="organization-unresolved"><h4>Needs designer judgment</h4><ul>{organization.unresolvedItems.map((entry) => <li key={entry.itemId}><strong>{snapshot.boardItems.find((item) => item.id === entry.itemId)?.title ?? entry.itemId}</strong>{entry.reason}</li>)}</ul></section>}
      {isStale && <p className="organization-stale" role="alert">The board changed after this preview. Reject it and generate a fresh organization before applying.</p>}
    </div> : <ol>
      {proposal.changes.map((change) => {
        const item = snapshot.boardItems.find((candidate) => candidate.id === change.itemId)
        return <li key={change.itemId}><strong>{item?.title ?? change.itemId}</strong><span>{[
          change.position ? `Move to X${change.position.x} Y${change.position.y}` : '',
          change.width || change.height ? `Size ${change.width ?? item?.width} × ${change.height ?? item?.height}` : '',
          change.locked !== undefined ? `${change.locked ? 'Lock' : 'Unlock'} item` : '',
          change.territory ? `Territory: ${change.territory}` : '',
          change.groupLabel ? `Group: ${change.groupLabel}` : '',
        ].filter(Boolean).join(' · ')}</span></li>
      })}
      {proposal.notes.map((note) => <li key={note.id}><strong>New note · {note.title}</strong><span>{note.territory} · X{note.position.x} Y{note.position.y} · {note.tone}</span></li>)}
    </ol>}
    <footer>
      <button type="button" className={isPreviewing ? 'is-previewing' : ''} onClick={onPreview}><Eye aria-hidden="true" />{isPreviewing ? 'Hide preview' : 'Preview on board'}</button>
      <button type="button" onClick={onReject}><X aria-hidden="true" />Reject</button>
      <button type="button" className="approve" disabled={isStale} onClick={onApprove}><Check aria-hidden="true" />{creativeTerritory ? 'Approve territory' : organization ? 'Apply organization' : 'Apply direction'}</button>
    </footer>
  </article>
}
