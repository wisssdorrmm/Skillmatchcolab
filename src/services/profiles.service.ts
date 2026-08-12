import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  // upsert, not update: if no trigger created the profiles row on signup,
  // a plain .update() would silently affect zero rows and leave the profile
  // missing — which then breaks anything with a foreign key to profiles.id
  // (like user_skills). Upsert guarantees the row exists either way.
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...updates }, { onConflict: 'id' })
  if (error) throw error
}

export async function getUserSkillIds(userId: string): Promise<number[]> {
  const { data, error } = await supabase.from('user_skills').select('skill_id').eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map((r) => r.skill_id)
}

export async function setUserSkills(userId: string, skillIds: number[]) {
  // Replace-all: simplest correct approach for a small skills list.
  const { error: delErr } = await supabase.from('user_skills').delete().eq('user_id', userId)
  if (delErr) throw delErr

  if (skillIds.length === 0) return

  const { error: insErr } = await supabase
    .from('user_skills')
    .insert(skillIds.map((skill_id) => ({ user_id: userId, skill_id })))
  if (insErr) throw insErr
}

export async function getSkillsForUser(userId: string) {
  const { data, error } = await supabase
    .from('user_skills')
    .select('skills(id, name)')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []).flatMap((r: any) => (r.skills ? [r.skills] : []))
}
