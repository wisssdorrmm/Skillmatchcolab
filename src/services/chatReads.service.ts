import { supabase } from '../lib/supabase'

export async function markChatRead(userId: string, projectId: string) {
  const { error } = await supabase
    .from('chat_reads')
    .upsert({ user_id: userId, project_id: projectId, last_read_at: new Date().toISOString() })
  if (error) throw error
}

export async function getReadTimestamps(userId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('chat_reads')
    .select('project_id, last_read_at')
    .eq('user_id', userId)
  if (error) throw error
  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.project_id] = row.last_read_at
  return map
}
