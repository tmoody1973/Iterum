'use client'

import { useMemo, useState } from 'react'
import { Grid3X3, LockKeyhole, Sparkles, X } from 'lucide-react'

import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { BoardOrganizationScope, WorkspaceState } from '../../lib/domain/types'

type ScopeOption = { value: string; label: string; scope: BoardOrganizationScope; unlocked: number; locked: number }

const slug = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28)

function scopeOptions(snapshot: WorkspaceState, selectedItemId: string | null): ScopeOption[] {
  const routes = snapshot.creativeRoutes.filter((route) => route.status !== 'rejected').map((route) => {
    const items = snapshot.boardItems.filter((item) => item.territory === route.territory)
    return { value: `route:${route.id}`, label: `Route · ${route.name}`, scope: { type: 'route' as const, routeId: route.id }, unlocked: items.filter((item) => !item.locked).length, locked: items.filter((item) => item.locked).length }
  })
  const territories = [...new Set(snapshot.boardItems.map((item) => item.territory))].sort().map((territory) => {
    const items = snapshot.boardItems.filter((item) => item.territory === territory)
    return { value: `territory:${territory}`, label: `Territory · ${territory}`, scope: { type: 'territory' as const, territory }, unlocked: items.filter((item) => !item.locked).length, locked: items.filter((item) => item.locked).length }
  })
  const selection = selectedItemId ? snapshot.boardItems.find((item) => item.id === selectedItemId) : undefined
  return [
    ...routes,
    ...territories,
    ...(selection ? [{ value: `selection:${selection.id}`, label: `Selection · ${selection.title}`, scope: { type: 'selection' as const, itemIds: [selection.id] }, unlocked: selection.locked ? 0 : 1, locked: selection.locked ? 1 : 0 }] : []),
    { value: 'whole-board', label: 'Whole board · explicit scope', scope: { type: 'whole-board' as const }, unlocked: snapshot.boardItems.filter((item) => !item.locked).length, locked: snapshot.boardItems.filter((item) => item.locked).length },
  ]
}

export function OrganizeStudio({ snapshot, runtime, selectedItemId, onClose, onProposed }: {
  snapshot: WorkspaceState
  runtime: WorkspaceRuntime
  selectedItemId: string | null
  onClose: () => void
  onProposed: (proposalId: string) => void
}) {
  const options = useMemo(() => scopeOptions(snapshot, selectedItemId), [selectedItemId, snapshot])
  const recommended = options.find((option) => option.value.startsWith('route:') && option.unlocked >= 2) ?? options.find((option) => option.unlocked > 0) ?? options[0]
  const [scopeValue, setScopeValue] = useState(recommended?.value ?? 'whole-board')
  const [strategy, setStrategy] = useState<'tag' | 'type'>('type')
  const [maximumGroups, setMaximumGroups] = useState(3)
  const [ranking, setRanking] = useState<'visual-weight' | 'board-order'>('visual-weight')
  const [message, setMessage] = useState('Nothing moves until you approve the exact preview in Review.')
  const selectedScope = options.find((option) => option.value === scopeValue) ?? recommended
  const canGenerate = Boolean(selectedScope?.unlocked)

  const generate = () => {
    if (!selectedScope) return
    const proposalId = `organization-${slug(scopeValue)}-${strategy}-v${snapshot.version}`
    const result = runtime.dispatch({
      type: 'propose-board-organization',
      campaignId: snapshot.campaign.id,
      boardId: snapshot.campaign.boardId,
      expectedVersion: snapshot.version,
      idempotencyKey: `organize-ui:${proposalId}`,
      actor: 'designer',
      request: {
        id: proposalId,
        title: `Organize ${selectedScope.label.replace(/^[^·]+·\s*/, '')} by ${strategy}`,
        scope: selectedScope.scope,
        strategy,
        layout: 'cluster-grid',
        maximumGroups,
        ranking,
        briefKeywords: snapshot.campaign.creativeBrief.tone,
      },
    })
    if (!result.ok) { setMessage(result.error.message); return }
    setMessage(result.receipt.summary)
    onProposed(proposalId)
  }

  return <section className="organize-studio" aria-labelledby="organize-studio-title">
    <header className="organize-studio-heading"><span><Grid3X3 aria-hidden="true" /><strong id="organize-studio-title">Organize direction</strong></span><button type="button" aria-label="Close Organize direction" onClick={onClose}><X aria-hidden="true" /></button></header>
    <p className="organize-intro">Turn a route or reference set into a clear hero, primary evidence, and supporting material.</p>
    <div className="organize-controls">
      <label>Scope<select value={scopeValue} onChange={(event) => setScopeValue(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>Group by<select value={strategy} onChange={(event) => setStrategy(event.target.value as 'tag' | 'type')}><option value="type">Item type</option><option value="tag">Approved tags</option></select></label>
      <label>Maximum groups<select value={maximumGroups} onChange={(event) => setMaximumGroups(Number(event.target.value))}>{[2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Choose hero by<select value={ranking} onChange={(event) => setRanking(event.target.value as 'visual-weight' | 'board-order')}><option value="visual-weight">Visual weight</option><option value="board-order">Current board order</option></select></label>
    </div>
    {selectedScope && <dl className="organize-scope-summary"><div><dt>Can arrange</dt><dd>{selectedScope.unlocked} items</dd></div><div><dt><LockKeyhole aria-hidden="true" />Protected</dt><dd>{selectedScope.locked} untouched</dd></div><div><dt>Layout</dt><dd>8px cluster grid</dd></div></dl>}
    <p className="organize-status" aria-live="polite">{message}</p>
    <footer><button type="button" disabled={!canGenerate} onClick={generate}><Sparkles aria-hidden="true" />Generate preview</button></footer>
  </section>
}
