import { supabase } from '../lib/supabase'
import { isMissingTable } from '../lib/schemaCompat'
import type { Hackathon, HackathonImportItem, ProfileLite } from '../types/database'

type Row = Omit<Hackathon, 'joined_count'> & { hackathon_interest?: { count: number }[] }

const toHackathon = ({ hackathon_interest, ...row }: Row): Hackathon => ({ ...row, joined_count: hackathon_interest?.[0]?.count ?? 0 })

/** YYYY-MM-DD in the viewer's own timezone. */
export function todayISO(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/** Open hackathons, soonest deadline first. `ready: false` means the database update hasn't been run yet. */
export async function listHackathons(): Promise<{ items: Hackathon[]; ready: boolean }> {
  const { data, error } = await supabase
    .from('hackathons')
    .select('*, hackathon_interest(count)')
    .eq('is_active', true)
    .or(`ends_on.gte.${todayISO()},ends_on.is.null`)
    .order('ends_on', { ascending: true, nullsFirst: false })
    .order('participants', { ascending: false })
    .limit(400)
  if (isMissingTable(error)) return { items: [], ready: false }
  if (error) throw error
  return { items: ((data ?? []) as unknown as Row[]).map(toHackathon), ready: true }
}

/** A few popular online hackathons that are still open — for the Home page. Empty if the section isn't set up yet. */
export async function listHackathonHighlights(limit = 3): Promise<Hackathon[]> {
  const { data, error } = await supabase
    .from('hackathons')
    .select('*, hackathon_interest(count)')
    .eq('is_active', true)
    .eq('is_online', true)
    .gte('ends_on', todayISO())
    .order('is_featured', { ascending: false })
    .order('participants', { ascending: false })
    .limit(limit)
  if (error) {
    if (isMissingTable(error)) return []
    throw error
  }
  return ((data ?? []) as unknown as Row[]).map(toHackathon)
}

export async function listMyHackathonIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('hackathon_interest').select('hackathon_id').eq('user_id', userId)
  if (isMissingTable(error)) return new Set()
  if (error) throw error
  return new Set((data ?? []).map((r) => r.hackathon_id as string))
}

export async function setHackathonJoined(hackathonId: string, userId: string, joined: boolean) {
  if (joined) {
    const { error } = await supabase.from('hackathon_interest').insert({ hackathon_id: hackathonId, user_id: userId })
    if (error && error.code !== '23505') throw error
  } else {
    const { error } = await supabase.from('hackathon_interest').delete().eq('hackathon_id', hackathonId).eq('user_id', userId)
    if (error) throw error
  }
}

export interface HackathonMember {
  user_id: string
  created_at: string
  profile: (ProfileLite & { country?: string | null }) | null
}

/** Members who said they're joining — so people can team up. */
export async function listHackathonMembers(hackathonId: string): Promise<HackathonMember[]> {
  const { data, error } = await supabase
    .from('hackathon_interest')
    .select('user_id, created_at, profile:profiles!user_id(id, name, avatar_url, username, primary_role, country, is_verified)')
    .eq('hackathon_id', hackathonId)
    .order('created_at')
    .limit(200)
  if (error) throw error
  return (data ?? []) as unknown as HackathonMember[]
}

// ---------------------------------------------------------------- admin

/** Everything, including hidden and finished ones. */
export async function listAllHackathons(): Promise<Hackathon[]> {
  const { data, error } = await supabase
    .from('hackathons')
    .select('*, hackathon_interest(count)')
    .order('ends_on', { ascending: true, nullsFirst: false })
    .limit(1000)
  if (error) throw error
  return ((data ?? []) as unknown as Row[]).map(toHackathon)
}

export type HackathonDraft = Partial<Pick<Hackathon, 'id' | 'title' | 'organizer' | 'url' | 'location' | 'is_online' | 'starts_on' | 'ends_on' | 'prize_text' | 'themes' | 'is_active' | 'is_featured'>>

export async function saveHackathon(draft: HackathonDraft) {
  const row = {
    title: (draft.title ?? '').trim(),
    organizer: draft.organizer?.trim() || null,
    url: (draft.url ?? '').trim(),
    location: draft.is_online ? 'Online' : draft.location?.trim() || null,
    is_online: draft.is_online ?? true,
    starts_on: draft.starts_on || null,
    ends_on: draft.ends_on || null,
    prize_text: draft.prize_text?.trim() || null,
    themes: (draft.themes ?? []).slice(0, 6),
    is_active: draft.is_active ?? true,
    is_featured: draft.is_featured ?? false,
  }
  const { error } = draft.id
    ? await supabase.from('hackathons').update(row).eq('id', draft.id)
    : await supabase.from('hackathons').insert({ ...row, source: 'Cobuild' })
  if (error) throw error
}

export async function patchHackathon(id: string, patch: Partial<Pick<Hackathon, 'is_active' | 'is_featured'>>) {
  const { error } = await supabase.from('hackathons').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteHackathon(id: string) {
  const { error } = await supabase.from('hackathons').delete().eq('id', id)
  if (error) throw error
}

export async function importHackathons(items: HackathonImportItem[]): Promise<number> {
  const { data, error } = await supabase.rpc('admin_import_hackathons', { p_items: items })
  if (error) throw error
  return (data as number) ?? 0
}

/**
 * Pull the current open + upcoming list from Devpost through our own small
 * server function (it only ever talks to Devpost, and results are cached).
 */
export async function fetchLatestHackathons(onProgress?: (done: number, total: number) => void): Promise<HackathonImportItem[]> {
  const all: HackathonImportItem[] = []
  let total = 0
  for (let page = 1; page <= 40; page++) {
    const res = await fetch(`/api/hackathons?page=${page}`)
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.includes('application/json')) {
      throw new Error(page === 1 ? 'The hackathon feed only works on the live site. Try again there.' : 'The hackathon feed stopped responding. Try again in a minute.')
    }
    const json = (await res.json()) as { items: HackathonImportItem[]; total: number; perPage: number; count: number }
    all.push(...json.items)
    total = json.total
    onProgress?.(Math.min(page * json.perPage, total), total)
    if (!json.count || page * json.perPage >= total) break
  }
  return all
}
