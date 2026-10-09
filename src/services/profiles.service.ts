import { supabase } from '../lib/supabase'
import type { Profile, Skill } from '../types/database'

export const PROFILE_LITE = 'id, name, avatar_url, username, primary_role, last_seen_at, show_online'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  // upsert so the row is guaranteed to exist even if no signup trigger made it
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...updates }, { onConflict: 'id' })
  if (error) throw error
}

export async function isUsernameAvailable(username: string, myId: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('id').ilike('username', username).limit(1)
  if (error) throw error
  return !data?.length || data[0].id === myId
}

export async function getUserSkillIds(userId: string): Promise<number[]> {
  const { data, error } = await supabase.from('user_skills').select('skill_id').eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map((r) => r.skill_id as number)
}

export async function setUserSkills(userId: string, skillIds: number[]) {
  const { error: delErr } = await supabase.from('user_skills').delete().eq('user_id', userId)
  if (delErr) throw delErr
  if (skillIds.length === 0) return
  const { error: insErr } = await supabase.from('user_skills').insert(skillIds.map((skill_id) => ({ user_id: userId, skill_id })))
  if (insErr) throw insErr
}

export async function getSkillsForUser(userId: string): Promise<Skill[]> {
  const { data, error } = await supabase.from('user_skills').select('skills(id, name)').eq('user_id', userId)
  if (error) throw error
  return (data ?? []).flatMap((r) => {
    const s = (r as unknown as { skills: Skill | null }).skills
    return s ? [s] : []
  })
}

export async function getAllSkills(): Promise<Skill[]> {
  const { data, error } = await supabase.from('skills').select('id, name').order('name')
  if (error) throw error
  return (data ?? []) as Skill[]
}

/** Strip characters that have meaning inside PostgREST .or() filters. */
export function safeSearchTerm(term: string): string {
  return term
    .replace(/[,()]/g, ' ')
    .replace(/[%_\\]/g, (c) => `\\${c}`)
    .trim()
    .slice(0, 100)
}

export interface PeopleFilters {
  search?: string
  role?: string
  limit?: number
}

export async function searchPeople({ search = '', role, limit = 60 }: PeopleFilters) {
  let query = supabase
    .from('profiles')
    .select('id, name, avatar_url, username, primary_role, country, bio, last_seen_at, show_online, experience_level')
    .not('name', 'is', null)
    .not('onboarded_at', 'is', null)
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .limit(limit)
  const q = safeSearchTerm(search)
  if (q) query = query.or(`name.ilike.%${q}%,username.ilike.%${q}%,primary_role.ilike.%${q}%,country.ilike.%${q}%`)
  if (role) query = query.eq('primary_role', role)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function countMembers(): Promise<number> {
  const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).not('name', 'is', null)
  if (error) throw error
  return count ?? 0
}
