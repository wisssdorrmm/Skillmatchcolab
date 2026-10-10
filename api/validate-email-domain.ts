import dns from 'dns'

// Basic domain-shape check: letters/digits/hyphens, dot-separated labels,
// reasonable length. Rejects garbage input before it ever reaches dns.resolveMx,
// so this endpoint can't be used as an arbitrary lookup relay or fed
// pathologically long strings.
const DOMAIN_PATTERN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

export default async function handler(req: any, res: any) {
  const domain = String(req.query?.domain ?? '').toLowerCase().trim()

  if (!domain || !DOMAIN_PATTERN.test(domain)) {
    res.status(200).json({ valid: false })
    return
  }

  dns.resolveMx(domain, (err, addresses) => {
    const hasMx = !err && Array.isArray(addresses) && addresses.length > 0
    // Cached at the edge so repeat lookups of the same domain never reach DNS again.
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    res.status(200).json({ valid: hasMx })
  })
}
