import { supabase } from '../lib/supabase'

export interface ChatThread {
  project_id: string
  project_title: string
  last_message: string | null
  last_message_at: string | null
}

// Projects the user can chat in: owned + joined.
export async function listMyChatThreads(userId: string): Promise<ChatThread[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('project_id, projects(id, title)')
    .eq('user_id', userId)
  if (error) throw error

  const threads: ChatThread[] = (data ?? [])
    .filter((r: any) => r.projects)
    .map((r: any) => ({
      project_id: r.projects.id,
      project_title: r.projects.title,
      last_message: null,
      last_message_at: null,
    }))

  // Fetch last message per project (small N, simple sequential fetch is fine).
  await Promise.all(
    threads.map(async (t) => {
      const { data: msg } = await supabase
        .from('messages')
        .select('text, created_at')
        .eq('project_id', t.project_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (msg) {
        t.last_message = msg.text
        t.last_message_at = msg.created_at
      }
    })
  )

  return threads.sort((a, b) => {
    if (!a.last_message_at) return 1
    if (!b.last_message_at) return -1
    return b.last_message_at.localeCompare(a.last_message_at)
  })
}
