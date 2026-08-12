import { supabase } from '../lib/supabase'

export async function getSavedProjectIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('saved_projects')
    .select('project_id')
    .eq('user_id', userId)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.project_id))
}

export async function saveProject(userId: string, projectId: string) {
  const { error } = await supabase
    .from('saved_projects')
    .insert({ user_id: userId, project_id: projectId })
  // Ignore "already saved" conflicts, surface anything else.
  if (error && error.code !== '23505') throw error
}

export async function unsaveProject(userId: string, projectId: string) {
  const { error } = await supabase
    .from('saved_projects')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId)
  if (error) throw error
}
