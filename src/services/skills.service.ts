import { supabase } from '../lib/supabase'
import type { Skill } from '../types/database'

export async function getAllSkills(): Promise<Skill[]> {
  const { data, error } = await supabase.from('skills').select('*').order('name')
  if (error) throw error
  return data ?? []
}
