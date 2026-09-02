/** Rejects credentials, loopback, link-local, and private literal IPs before a provider fetches a URL. */
export function isPublicHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    const isIpv6 = host.includes(':')
    if (!host || host === 'localhost' || host.endsWith('.local') || host === '::1' || (isIpv6 && (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')))) return false
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (!ipv4) return true
    const octets = ipv4.slice(1).map(Number)
    return !(
      octets.some((part) => part > 255)
      || octets[0] === 10 || octets[0] === 127 || octets[0] === 0 || octets[0] >= 224
      || (octets[0] === 169 && octets[1] === 254)
      || (octets[0] === 192 && octets[1] === 168)
      || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    )
  } catch { return false }
}
