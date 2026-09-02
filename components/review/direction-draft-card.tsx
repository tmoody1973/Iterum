'use client'

import { Check, Eye, Layers3, X } from 'lucide-react'

import type { BoardLayoutProposal, WorkspaceState } from '../../lib/domain/types'

export function DirectionDraftCard({ proposal, snapshot, isPreviewing, onPreview, onApprove, onReject }: {
  proposal: BoardLayoutProposal
  snapshot: WorkspaceState
  isPreviewing: boolean
  onPreview: () => void
  onApprove: () => void
  onReject: () => void
}) {
  return <article className="direction-draft-card" aria-label={`Direction Draft: ${proposal.title}`}>
    <header><p><Layers3 aria-hidden="true" />Direction Draft</p><span>{proposal.changes.length + proposal.notes.length} changes</span></header>
    <h3>{proposal.title}</h3>
    <p className="direction-draft-rationale">{proposal.rationale}</p>
    <ol>
      {proposal.changes.map((change) => {
        const item = snapshot.boardItems.find((candidate) => candidate.id === change.itemId)
        return <li key={change.itemId}><strong>{item?.title ?? change.itemId}</strong><span>{[
          change.position ? `Move to X${change.position.x} Y${change.position.y}` : '',
          change.width || change.height ? `Size ${change.width ?? item?.width} × ${change.height ?? item?.height}` : '',
          change.territory ? `Territory: ${change.territory}` : '',
          change.groupLabel ? `Group: ${change.groupLabel}` : '',
        ].filter(Boolean).join(' · ')}</span></li>
      })}
      {proposal.notes.map((note) => <li key={note.id}><strong>New note · {note.title}</strong><span>{note.territory} · X{note.position.x} Y{note.position.y} · {note.tone}</span></li>)}
    </ol>
    <footer>
      <button type="button" className={isPreviewing ? 'is-previewing' : ''} onClick={onPreview}><Eye aria-hidden="true" />{isPreviewing ? 'Hide preview' : 'Preview on board'}</button>
      <button type="button" onClick={onReject}><X aria-hidden="true" />Reject</button>
      <button type="button" className="approve" onClick={onApprove}><Check aria-hidden="true" />Apply direction</button>
    </footer>
  </article>
}
