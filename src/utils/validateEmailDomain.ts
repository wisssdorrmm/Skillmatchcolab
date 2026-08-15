// Checks whether an email's domain has real MX records — catches typo/fake
// domains like "languahe.com" that aren't on any disposable-email blocklist
// but simply can't receive mail. Requires the /api/validate-email-domain
// serverless function, which only runs on Vercel (or `vercel dev` locally),
// not on a plain `npm run dev` server — so this "fails open" (allows signup)
// if the endpoint isn't reachable, rather than blocking real users due to
// our own infrastructure gap.
export async function hasValidMxRecords(email: string): Promise<boolean> {
  const domain = email.split('@')[1]
  if (!domain) return false

  try {
    const res = await fetch(`/api/validate-email-domain?domain=${encodeURIComponent(domain)}`)
    if (!res.ok) return true
    const data = await res.json()
    return !!data.valid
  } catch {
    return true
  }
}
