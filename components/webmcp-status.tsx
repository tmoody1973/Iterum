'use client'

import { useUiStore } from '../stores/ui-store'

export function WebMcpStatus() {
  const status = useUiStore((state) => state.webMcpStatus)
  const copy = status === 'ready' ? 'WebMCP ready' : status === 'error' ? 'WebMCP unavailable' : 'WebMCP preview'

  return <p className={`webmcp-status is-${status}`} aria-live="polite"><span aria-hidden="true" />{copy}</p>
}
