// Live list of open + upcoming hackathons, read from Devpost's public listing.
//
// Safety notes:
//  - The upstream address is fixed. The only input is a page number (1–40), so
//    this can never be pointed at another site.
//  - No keys or cookies are used or forwarded; it returns public data only.
//  - Responses are cached at the edge for an hour, so however often this is
//    called we hit Devpost at most once per page per hour.
//  - Everything is re-checked by the database (admin_import_hackathons) before
//    it is saved, and only admins can save.

const UPSTREAM = 'https://devpost.com/api/hackathons'
const MONTHS: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 }
// Rough conversion, used only to sort by prize size. The prize is always shown as the organiser wrote it.
const RATES: Record<string, number> = { $: 1, '€': 1.08, '£': 1.27, '₹': 0.012, '¥': 0.0067, '₦': 0.00065, CA$: 0.73, $CAD: 0.73, A$: 0.66 }
const IMAGE_HOST = /^https:\/\/d112y698adiu2z\.cloudfront\.net\//

const iso = (y: string, m: string, d: string) => `${y}-${String(MONTHS[m]).padStart(2, '0')}-${d.padStart(2, '0')}`

function parseDates(s: string): [string | null, string | null] {
  let m: RegExpMatchArray | null
  if ((m = s.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) - ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/))) return [iso(m[3], m[1], m[2]), iso(m[6], m[4], m[5])]
  if ((m = s.match(/^([A-Z][a-z]{2}) (\d{1,2}) - ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/))) return [iso(m[5], m[1], m[2]), iso(m[5], m[3], m[4])]
  if ((m = s.match(/^([A-Z][a-z]{2}) (\d{1,2}) - (\d{1,2}), (\d{4})$/))) return [iso(m[4], m[1], m[2]), iso(m[4], m[1], m[3])]
  if ((m = s.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/))) return [iso(m[3], m[1], m[2]), iso(m[3], m[1], m[2])]
  return [null, null]
}

const strip = (s: unknown) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const clip = (s: unknown, max: number) => {
  const t = strip(s)
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

function prize(h: any): { p: string | null; pu: number | null } {
  const m = strip(h.prize_amount).match(/^([^\d\s]+)\s*([\d,]+(?:\.\d+)?)$/)
  if (!m) return { p: null, pu: null }
  const value = Number(m[2].replace(/,/g, ''))
  if (!value) return { p: h.prizes_counts?.other > 0 ? 'Non-cash prizes' : null, pu: null }
  const rate = RATES[m[1]]
  return { p: `${m[1] === '$CAD' ? 'CA$' : m[1]}${m[2]}`, pu: rate ? Math.round(value * rate) : null }
}

function toItem(h: any) {
  if (!h || h.invite_only) return null
  const url = String(h.url ?? '')
  if (!/^https:\/\/[a-z0-9-]+\.devpost\.com\/$/.test(url)) return null
  const [s, e] = parseDates(String(h.submission_period_dates ?? ''))
  if (!e) return null
  const place = strip(h.displayed_location?.location)
  const on = h.displayed_location?.icon === 'globe' || /^online$/i.test(place)
  const org = clip(h.organization_name, 80)
  const thumb = typeof h.thumbnail_url === 'string' ? (h.thumbnail_url.startsWith('//') ? `https:${h.thumbnail_url}` : h.thumbnail_url) : ''
  return {
    t: clip(h.title, 140),
    o: /^(n\/?a|nill?|none|-|student organization)?$/i.test(org) ? null : org,
    u: url,
    l: on ? 'Online' : clip(place, 80) || null,
    on,
    s,
    e,
    ...prize(h),
    th: Array.isArray(h.themes) ? h.themes.map((x: any) => clip(x?.name, 40)).filter(Boolean).slice(0, 4) : [],
    n: Number.isFinite(h.registrations_count) ? Math.max(0, Math.floor(h.registrations_count)) : 0,
    src: 'Devpost',
    img: IMAGE_HOST.test(thumb) ? thumb : null,
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const page = Math.min(40, Math.max(1, Number.parseInt(String(req.query?.page ?? '1'), 10) || 1))

  try {
    const upstream = await fetch(`${UPSTREAM}?status[]=open&status[]=upcoming&order_by=deadline&page=${page}`, {
      headers: { accept: 'application/json', 'user-agent': 'Cobuild hackathon list (+https://skillmatchcolab.vercel.app)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`)
    const json: any = await upstream.json()
    const list: any[] = Array.isArray(json?.hackathons) ? json.hackathons : []

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).json({
      items: list.map(toItem).filter(Boolean),
      count: list.length,
      total: Number(json?.meta?.total_count) || 0,
      perPage: Number(json?.meta?.per_page) || 9,
    })
  } catch {
    res.setHeader('Cache-Control', 'no-store')
    res.status(502).json({ error: 'The hackathon source is not responding right now.' })
  }
}
