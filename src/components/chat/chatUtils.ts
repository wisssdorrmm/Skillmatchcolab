import { useLayoutEffect, useRef } from 'react'

/** Insert a separator whenever the calendar day changes. */
export function withDays<T extends { created_at: string }>(items: T[]): ({ kind: 'day'; iso: string } | { kind: 'item'; item: T })[] {
  const out: ({ kind: 'day'; iso: string } | { kind: 'item'; item: T })[] = []
  let last = ''
  for (const item of items) {
    const d = new Date(item.created_at).toDateString()
    if (d !== last) {
      out.push({ kind: 'day', iso: item.created_at })
      last = d
    }
    out.push({ kind: 'item', item })
  }
  return out
}

/** Scroll to the bottom on first load and when new messages arrive while you're near the bottom. */
export function useStickToBottom(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (first.current || nearBottom) {
      el.scrollTop = el.scrollHeight
      if (el.scrollHeight > 0) first.current = false
    }
  }, [dep])
  return ref
}

