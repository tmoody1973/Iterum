'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

let pendingAnonymousSignIn: Promise<unknown> | null = null

export function DesignerSessionBoundary({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useAuthActions()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (isLoading || isAuthenticated) return
    let active = true
    setError('')
    const request = pendingAnonymousSignIn ?? signIn('anonymous')
    pendingAnonymousSignIn = request
    void request.catch((signInError) => {
      if (active) setError(signInError instanceof Error ? signInError.message : 'A private designer session could not be created.')
    }).finally(() => {
      if (pendingAnonymousSignIn === request) pendingAnonymousSignIn = null
    })
    return () => { active = false }
  }, [attempt, isAuthenticated, isLoading, signIn])

  if (isAuthenticated) return children

  return <main className="project-gate" aria-live="polite" aria-busy={!error}>
    <p className="project-gate-kicker">Iterum private workspace</p>
    <h1>{error ? 'Session unavailable' : 'Preparing your desk'}</h1>
    <p>{error || 'Creating a private designer session for this browser…'}</p>
    {error && <button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button>}
    <small>Projects created in this guest session are visible only in this browser. Account sign-in comes next for multi-device access.</small>
  </main>
}
