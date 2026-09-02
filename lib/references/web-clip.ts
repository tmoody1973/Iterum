import { isPublicHttpUrl } from './public-url'

export const WEB_CLIP_PARAMS = ['clip', 'clip_id', 'clip_source', 'clip_image', 'clip_title'] as const

export interface WebClip {
  id: string
  title: string
  sourceUrl: string
  imageUrl?: string
}

export type WebClipParseResult = { ok: true; clip: WebClip } | { ok: false; message: string }

const CLIP_ID = /^[A-Za-z0-9_-]{1,80}$/

/** Parses an untrusted extension handoff without accepting private URLs or executable schemes. */
export function parseWebClipUrl(value: string | URL): WebClipParseResult | null {
  let url: URL
  try { url = typeof value === 'string' ? new URL(value) : value } catch { return null }
  if (url.searchParams.get('clip') !== '1') return null

  const id = url.searchParams.get('clip_id')?.trim() ?? ''
  const sourceUrl = url.searchParams.get('clip_source')?.trim() ?? ''
  const imageUrl = url.searchParams.get('clip_image')?.trim() ?? ''
  const title = url.searchParams.get('clip_title')?.trim().slice(0, 180) || 'Untitled web clip'

  if (!CLIP_ID.test(id)) return { ok: false, message: 'The clip handoff is missing a valid identifier.' }
  if (sourceUrl.length > 4096 || !isPublicHttpUrl(sourceUrl)) return { ok: false, message: 'The clip source must be a public webpage.' }
  if (imageUrl && (imageUrl.length > 4096 || !isPublicHttpUrl(imageUrl))) return { ok: false, message: 'The clipped image must use a public web URL.' }

  return { ok: true, clip: { id, title, sourceUrl, ...(imageUrl ? { imageUrl } : {}) } }
}

export function urlWithoutWebClip(value: string | URL): string {
  const url = typeof value === 'string' ? new URL(value) : new URL(value)
  WEB_CLIP_PARAMS.forEach((parameter) => url.searchParams.delete(parameter))
  return `${url.pathname}${url.search}${url.hash}`
}
