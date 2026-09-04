'use client'

import { useQuery } from 'convex/react'
import { useEffect, useState } from 'react'

import { api } from '../../convex/_generated/api'
import type { ReviewerGrantSession } from '../../lib/persistence/project-controller'
import { PersistentProjectWorkspace } from './persistent-project-workspace'

export function ReviewerProjectWorkspace({ projectKey, initialGrantKey }: { projectKey: string; initialGrantKey?: string }) {
  const storageKey = `iterum:reviewer-pass:${projectKey}`
  const [grantKey, setGrantKey] = useState(initialGrantKey ?? '')

  useEffect(() => {
    if (!grantKey) setGrantKey(sessionStorage.getItem(storageKey) ?? '')
  }, [grantKey, storageKey])

  const grant = useQuery(api.reviewerGrants.resolve, grantKey ? { projectKey, grantKey } : 'skip') as ReviewerGrantSession | null | undefined

  useEffect(() => {
    if (!grant) return
    sessionStorage.setItem(storageKey, grant.grantKey)
    if (window.location.search) window.history.replaceState(null, '', `/projects/${encodeURIComponent(projectKey)}/review`)
  }, [grant, projectKey, storageKey])

  if (!grantKey || grant === null) return <main className="project-gate"><p className="project-gate-kicker">Iterum / Independent review</p><h1>Reviewer pass required</h1><p>Create a scoped pass from the owner setup page, then open its one-time reviewer link in this task.</p></main>
  if (grant === undefined) return <main className="project-gate" aria-live="polite"><p className="project-gate-kicker">Iterum / Independent review</p><h1>Validating reviewer pass</h1><p>Checking project, session pair, expiry, and cost ceiling…</p></main>
  return <PersistentProjectWorkspace projectKey={projectKey} reviewerGrant={grant} />
}
