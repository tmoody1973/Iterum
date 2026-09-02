'use client'

import { useEffect } from 'react'

import type { WorkspaceRuntime } from '../lib/domain/workspace-runtime'
import type { CapturedReference } from '../lib/references/types'
import { parseWebClipUrl, urlWithoutWebClip } from '../lib/references/web-clip'
import { useUiStore } from '../stores/ui-store'

export function useWebClipIntake(runtime: WorkspaceRuntime) {
  const setActiveRightTab = useUiStore((state) => state.setActiveRightTab)
  const setReviewDrawerOpen = useUiStore((state) => state.setReviewDrawerOpen)
  const setWebClipMessage = useUiStore((state) => state.setWebClipMessage)

  useEffect(() => {
    const parsed = parseWebClipUrl(window.location.href)
    if (!parsed) return
    window.history.replaceState(window.history.state, '', urlWithoutWebClip(window.location.href))

    if (!parsed.ok) {
      setWebClipMessage(parsed.message)
      setActiveRightTab('review')
      setReviewDrawerOpen(true)
      return
    }

    const receive = async () => {
      const { clip } = parsed
      setWebClipMessage(`Receiving “${clip.title}” from the browser clipper…`)
      let imageUrl = clip.imageUrl
      let title = clip.title
      let attribution = new URL(clip.sourceUrl).hostname.replace(/^www\./, '')
      let rationale = `One-click web clip preserved from ${attribution} for designer review.`

      if (!imageUrl) {
        try {
          const response = await fetch(`/api/references/capture?url=${encodeURIComponent(clip.sourceUrl)}`)
          if (response.ok) {
            const capture = await response.json() as CapturedReference
            imageUrl = capture.imageUrl
            title = capture.title || title
            attribution = capture.attribution || attribution
            rationale = capture.description || rationale
          }
        } catch { /* The source-only clip is still useful when preview capture is unavailable. */ }
      }

      const state = runtime.getSnapshot()
      const result = runtime.dispatch({
        type: 'propose-reference', campaignId: state.campaign.id, boardId: state.campaign.boardId,
        expectedVersion: state.version, idempotencyKey: `web-clip:${clip.id}`, actor: 'designer',
        proposal: {
          id: `web-clip-${clip.id}`, title, ...(imageUrl ? { imageUrl } : {}), sourceUrl: clip.sourceUrl,
          attribution, rightsStatus: 'uncertain', rationale, intendedTerritory: 'Agent Additions',
          crop: { x: 0, y: 0, width: 100, height: 100 }, captureProvider: 'web-clipper',
        },
      })
      setWebClipMessage(result.ok ? `Web clip received · ${title} is waiting for review.` : result.error.message)
      setActiveRightTab('review')
      setReviewDrawerOpen(true)
    }

    void receive()
  }, [runtime, setActiveRightTab, setReviewDrawerOpen, setWebClipMessage])
}
