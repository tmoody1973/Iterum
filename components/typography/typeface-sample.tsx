'use client'

import { useEffect, type ReactNode } from 'react'

import type { TypefaceCandidate } from '../../lib/domain/types'

export function fontFamilyFor(candidate: TypefaceCandidate | null | undefined) {
  return candidate && !candidate.referenceOnly ? `'${candidate.family}', ${candidate.category}` : undefined
}

export function useTypefaceStylesheet(candidate: TypefaceCandidate | null | undefined) {
  useEffect(() => {
    if (!candidate?.cssUrl || candidate.referenceOnly) return
    const existing = [...document.querySelectorAll<HTMLLinkElement>('link[data-iterum-typeface]')].some((link) => link.href === candidate.cssUrl)
    if (existing) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'; link.href = candidate.cssUrl; link.dataset.iterumTypeface = candidate.id
    document.head.append(link)
  }, [candidate])
}

export function TypefaceSample({ candidate, className, children }: { candidate: TypefaceCandidate; className?: string; children: ReactNode }) {
  useTypefaceStylesheet(candidate)
  return <div className={className} style={{ fontFamily: fontFamilyFor(candidate) }} data-reference-only={candidate.referenceOnly || undefined}>{children}</div>
}
