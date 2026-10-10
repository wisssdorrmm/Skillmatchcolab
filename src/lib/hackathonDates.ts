import type { Hackathon } from '../types/database'

const DAY = 86_400_000

/** Dates are stored as plain days (YYYY-MM-DD); read them in the viewer's own timezone. */
export function parseDay(day: string | null | undefined): Date | null {
  const m = day?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

export function daysUntil(day: string | null | undefined, now = new Date()): number | null {
  const d = parseDay(day)
  if (!d) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((d.getTime() - today.getTime()) / DAY)
}

const short = (d: Date, withYear: boolean) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) })

/** "Oct 12 – 18", "Oct 30 – Nov 1", "Dec 18, 2026 – Jan 4, 2027". */
export function dateRange(start: string | null, end: string | null): string {
  const s = parseDay(start)
  const e = parseDay(end)
  const thisYear = new Date().getFullYear()
  if (!s && !e) return 'Dates on the official page'
  if (!s || !e || s.getTime() === e.getTime()) {
    const only = (e ?? s)!
    return short(only, only.getFullYear() !== thisYear)
  }
  if (s.getFullYear() !== e.getFullYear()) return `${short(s, true)} – ${short(e, true)}`
  const year = e.getFullYear() !== thisYear ? `, ${e.getFullYear()}` : ''
  if (s.getMonth() === e.getMonth()) return `${short(s, false)} – ${e.getDate()}${year}`
  return `${short(s, false)} – ${short(e, false)}${year}`
}

export function deadline(h: Pick<Hackathon, 'starts_on' | 'ends_on'>): { label: string; tone: 'danger' | 'warning' | 'info' | 'neutral' } {
  const toStart = daysUntil(h.starts_on)
  const toEnd = daysUntil(h.ends_on)
  if (toStart != null && toStart > 0) return { label: toStart === 1 ? 'Starts tomorrow' : toStart <= 14 ? `Starts in ${toStart} days` : `Starts ${short(parseDay(h.starts_on)!, false)}`, tone: 'info' }
  if (toEnd == null) return { label: 'Open', tone: 'neutral' }
  if (toEnd <= 0) return { label: 'Ends today', tone: 'danger' }
  if (toEnd === 1) return { label: '1 day left', tone: 'danger' }
  if (toEnd <= 7) return { label: `${toEnd} days left`, tone: 'warning' }
  return { label: `${toEnd} days left`, tone: 'neutral' }
}
