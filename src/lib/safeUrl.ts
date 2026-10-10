/**
 * Only plain web links are ever put in an href. Anything else (javascript:,
 * data:, a broken value…) is dropped, so stored text can never run code.
 */
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  const value = url.trim()
  if (!/^https?:\/\//i.test(value)) return undefined
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined
  } catch {
    return undefined
  }
}

/** "devpost.com" from "https://xyz.devpost.com/path" — shown next to outside links. */
export function hostLabel(url: string | null | undefined): string {
  const safe = safeUrl(url)
  if (!safe) return ''
  return new URL(safe).hostname.replace(/^www\./, '')
}
