const ITERUM_URL = 'http://127.0.0.1:3333/'

function publicHttpUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}

export function buildIterumClipUrl({ sourceUrl, imageUrl, title, id = crypto.randomUUID() }) {
  if (!publicHttpUrl(sourceUrl)) return null
  const url = new URL(ITERUM_URL)
  url.searchParams.set('clip', '1')
  url.searchParams.set('clip_id', id)
  url.searchParams.set('clip_source', sourceUrl)
  url.searchParams.set('clip_title', String(title || new URL(sourceUrl).hostname).slice(0, 180))
  if (publicHttpUrl(imageUrl)) url.searchParams.set('clip_image', imageUrl)
  return url.toString()
}
