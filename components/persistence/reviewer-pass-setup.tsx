'use client'

import { useAction } from 'convex/react'
import { useState } from 'react'

import { api } from '../../convex/_generated/api'
import type { ReviewerGrantSession } from '../../lib/persistence/project-controller'

function creativeSessionId() {
  const existing = localStorage.getItem('iterum:webmcp:creative-session:review-handoff')
  if (existing) return existing
  const created = `creative_${crypto.randomUUID()}`
  localStorage.setItem('iterum:webmcp:creative-session:review-handoff', created)
  return created
}

export function ReviewerPassSetup({ projectKey }: { projectKey: string }) {
  const createGrant = useAction(api.reviewerGrants.create)
  const [grant, setGrant] = useState<ReviewerGrantSession | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (busy) return
    setBusy(true)
    setMessage('Creating a scoped reviewer pass…')
    try {
      const next = await createGrant({
        projectKey,
        creativeSessionId: creativeSessionId(),
        reviewerSessionId: `reviewer_${crypto.randomUUID()}`,
        expiresInMinutes: 120,
        costCeilingUsd: 0.25,
      }) as ReviewerGrantSession
      setGrant(next)
      setMessage('Reviewer pass ready. Open it in the separate Reviewer Agent task before recording.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The reviewer pass could not be created.')
    } finally {
      setBusy(false)
    }
  }

  const reviewerUrl = grant ? `/projects/${encodeURIComponent(projectKey)}/review?grant=${encodeURIComponent(grant.grantKey)}` : ''

  return <main className="project-gate reviewer-pass-setup">
    <p className="project-gate-kicker">Iterum / Demo authority</p>
    <h1>Prepare an independent reviewer</h1>
    <p>This owner-only setup creates a short-lived pass for one creative session and one separate reviewer session. It is not exposed as a WebMCP tool.</p>
    <dl>
      <div><dt>Scope</dt><dd>{projectKey}</dd></div>
      <div><dt>Expires</dt><dd>2 hours after creation</dd></div>
      <div><dt>Generation ceiling</dt><dd>$0.25 total per exact approved quote</dd></div>
    </dl>
    {!grant ? <button type="button" onClick={create} disabled={busy}>{busy ? 'Preparing…' : 'Create reviewer pass'}</button> : <a className="reviewer-pass-link" href={reviewerUrl}>Open reviewer workspace</a>}
    {message && <p role="status">{message}</p>}
    <p><a href={`/projects/${encodeURIComponent(projectKey)}`}>Return to creative workspace</a></p>
  </main>
}
