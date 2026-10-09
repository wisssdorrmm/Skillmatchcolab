import { Fragment } from 'react'
import { Link } from 'react-router-dom'

// @username (3–20 chars) and #room-name, only at the start or after whitespace
// so email addresses like ada@gmail.com are left alone.
const TOKEN = /(^|\s)(@[A-Za-z0-9_]{3,20}|#[a-z0-9-]{2,40})/g

/** Plain text where @mentions link to profiles and #rooms link to community rooms. */
export function RichText({ text }: { text: string }) {
  const parts: (string | { kind: 'user' | 'room'; value: string })[] = []
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    const tokenStart = (m.index ?? 0) + m[1].length
    if (tokenStart > last) parts.push(text.slice(last, tokenStart))
    parts.push({ kind: m[2].startsWith('@') ? 'user' : 'room', value: m[2] })
    last = tokenStart + m[2].length
  }
  if (last < text.length) parts.push(text.slice(last))

  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <Fragment key={i}>{p}</Fragment>
        ) : p.kind === 'user' ? (
          <Link key={i} to={`/u/${encodeURIComponent(p.value.toLowerCase())}`} className="font-semibold text-accent hover:underline">
            {p.value}
          </Link>
        ) : (
          <Link key={i} to={`/community/${p.value.slice(1)}`} className="font-medium text-accent hover:underline">
            {p.value}
          </Link>
        ),
      )}
    </>
  )
}
