import dns from 'dns'

// Vercel serverless function — plain Node handler, no @vercel/node type
// package needed, keeps this dependency-free.
export default async function handler(req: any, res: any) {
  const domain = String(req.query?.domain ?? '').toLowerCase().trim()

  if (!domain) {
    res.status(400).json({ valid: false, error: 'Missing domain' })
    return
  }

  dns.resolveMx(domain, (err, addresses) => {
    const hasMx = !err && Array.isArray(addresses) && addresses.length > 0
    res.status(200).json({ valid: hasMx })
  })
}
