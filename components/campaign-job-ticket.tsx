'use client'

import { LockKeyhole, LockOpen, Save } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Actor, Campaign, CampaignBrief, WorkspaceState } from '../lib/domain/types'
import type { WorkspaceRuntime } from '../lib/domain/workspace-runtime'
import type { ProjectSaveStatus } from '../lib/persistence/project-controller'

const joinList = (items: string[]) => items.join('\n')
const splitList = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean)

export function CampaignJobTicket({ campaign, version, runtime, onClose, projectStatus, lockActor }: { campaign: Campaign; version: WorkspaceState['version']; runtime: WorkspaceRuntime; onClose?: () => void; projectStatus?: ProjectSaveStatus; lockActor?: Actor }) {
  const [name, setName] = useState(campaign.name)
  const [line, setLine] = useState(campaign.line)
  const [brief, setBrief] = useState({ ...campaign.creativeBrief, tone: joinList(campaign.creativeBrief.tone), mandatoryAssets: joinList(campaign.creativeBrief.mandatoryAssets), antiDirections: joinList(campaign.creativeBrief.antiDirections) })
  const [message, setMessage] = useState('')
  const locked = campaign.briefStatus === 'locked'

  useEffect(() => {
    setName(campaign.name); setLine(campaign.line)
    setBrief({ ...campaign.creativeBrief, tone: joinList(campaign.creativeBrief.tone), mandatoryAssets: joinList(campaign.creativeBrief.mandatoryAssets), antiDirections: joinList(campaign.creativeBrief.antiDirections) })
  }, [campaign])

  const updateField = (field: keyof typeof brief, value: string) => setBrief((current) => ({ ...current, [field]: value }))
  const commandBrief = (): CampaignBrief => ({ ...brief, tone: splitList(brief.tone), mandatoryAssets: splitList(brief.mandatoryAssets), antiDirections: splitList(brief.antiDirections) })
  const saveDraft = () => {
    const current = runtime.getSnapshot()
    const result = runtime.dispatch({ type: 'update-campaign-brief', campaignId: campaign.id, boardId: campaign.boardId, expectedVersion: current.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', name, line, brief: commandBrief() })
    setMessage(result.ok ? result.receipt.summary : result.error.message)
    return result
  }
  const setLock = (nextLocked: boolean) => {
    const current = runtime.getSnapshot()
    const result = runtime.dispatch({ type: 'set-campaign-brief-lock', campaignId: current.campaign.id, boardId: current.campaign.boardId, expectedVersion: current.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', locked: nextLocked })
    setMessage(result.ok ? result.receipt.summary : result.error.message)
  }
  const saveAndLock = () => { const saved = saveDraft(); if (saved.ok) setLock(true) }

  return <aside className="job-ticket" id="campaign-job-ticket" aria-label="Campaign job ticket">
    <div className="ticket-topline"><span>Campaign brief</span><span className="ticket-id">{locked ? 'Locked' : 'Draft'}</span><button className="drawer-close" type="button" onClick={onClose}>Close brief</button></div>
    <section className="ticket-title" aria-labelledby="campaign-name">
      {locked ? <><h1 id="campaign-name">{campaign.name}</h1><p>{campaign.line}</p></> : <><label>Campaign name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Working line<input value={line} onChange={(event) => setLine(event.target.value)} /></label></>}
    </section>
    <div className="brief-fields">
      <BriefField label="Objective" value={brief.objective} locked={locked} onChange={(value) => updateField('objective', value)} />
      <BriefField label="Audience" value={brief.audience} locked={locked} onChange={(value) => updateField('audience', value)} />
      <BriefField label="Proposition" value={brief.proposition} locked={locked} onChange={(value) => updateField('proposition', value)} />
      <BriefField label="Tone / one per line" value={brief.tone} locked={locked} onChange={(value) => updateField('tone', value)} />
      <BriefField label="Mandatory assets / one per line" value={brief.mandatoryAssets} locked={locked} onChange={(value) => updateField('mandatoryAssets', value)} />
      <BriefField label="Anti-directions / one per line" value={brief.antiDirections} locked={locked} onChange={(value) => updateField('antiDirections', value)} />
      <BriefField label="Schedule" value={brief.schedule} locked={locked} onChange={(value) => updateField('schedule', value)} singleLine />
    </div>
    <section className="version-history" aria-labelledby="version-history"><h2 id="version-history">{projectStatus ? 'Cloud state' : 'Session state'}</h2><p>Board V{String(version).padStart(2, '0')} · {projectStatus ? `revision ${projectStatus.headRevision ?? '—'}` : 'one local session'}</p><small>{projectStatus ? `${projectStatus.message}. Named checkpoints and restore controls are available in History.` : 'Open Projects to create a persistent cloud campaign.'}</small></section>
    {message && <p className="ticket-message" aria-live="polite">{message}</p>}
    <footer className="ticket-footer">
      {locked ? <><span><LockKeyhole aria-hidden="true" />Brief locked by {lockActor === 'reviewer' ? 'Reviewer Agent' : 'designer'}</span><button type="button" onClick={() => setLock(false)}><LockOpen aria-hidden="true" />Edit brief</button></> : <><button type="button" onClick={saveDraft}><Save aria-hidden="true" />Save draft</button><button type="button" onClick={saveAndLock}><LockKeyhole aria-hidden="true" />Save + lock</button></>}
    </footer>
  </aside>
}

function BriefField({ label, value, locked, onChange, singleLine = false }: { label: string; value: string; locked: boolean; onChange: (value: string) => void; singleLine?: boolean }) {
  return <section className="ticket-copy"><h2>{label}</h2>{locked ? <p>{value.split('\n').map((line) => <span key={line}>{line}</span>)}</p> : singleLine ? <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} /> : <textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} rows={Math.min(5, Math.max(2, value.split('\n').length))} />}</section>
}
