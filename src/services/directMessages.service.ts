import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface DirectMessage {
  id: string
  project_id: string
  applicant_id: string
  sender_id: string
  text: string
  created_at: string
  sender?: { id: string; name: string | null; avatar_url: string | null } | null
}

export async function listDirectMessages(projectId: string, applicantId: string): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*, sender:profiles!sender_id(id, name, avatar_url)')
    .eq('project_id', projectId)
    .eq('applicant_id', applicantId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as DirectMessage[]
}

export async function sendDirectMessage(
  projectId: string,
  applicantId: string,
  senderId: string,
  text: string
) {
  const { error } = await supabase
    .from('direct_messages')
    .insert({ project_id: projectId, applicant_id: applicantId, sender_id: senderId, text })
  if (error) throw error
}

export function subscribeToDirectMessages(
  projectId: string,
  applicantId: string,
  onInsert: (message: DirectMessage) => void
): RealtimeChannel {
  return supabase
    .channel(`dm:${projectId}:${applicantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        const msg = payload.new as DirectMessage
        if (msg.applicant_id === applicantId) onInsert(msg)
      }
    )
    .subscribe()
}

// For owners: list every applicant thread across their projects that has at least one message,
// so they have a way to find "conversations in progress" without hunting through each project.
export async function listMyOwnerThreads(ownerId: string) {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('project_id, applicant_id, text, created_at, projects!inner(id, title, owner_id), applicant:profiles!applicant_id(id, name, avatar_url)')
    .eq('projects.owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error

  // Collapse to one row per (project_id, applicant_id) thread, keeping the latest message.
  const seen = new Set<string>()
  const threads: any[] = []
  for (const row of data ?? []) {
    const key = `${row.project_id}:${row.applicant_id}`
    if (seen.has(key)) continue
    seen.add(key)
    threads.push(row)
  }
  return threads
}

// For applicants: list every thread they're part of, across any project they've applied to.
export async function listMyApplicantThreads(applicantId: string) {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('project_id, applicant_id, text, created_at, projects(id, title)')
    .eq('applicant_id', applicantId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const seen = new Set<string>()
  const threads: any[] = []
  for (const row of data ?? []) {
    if (seen.has(row.project_id)) continue
    seen.add(row.project_id)
    threads.push(row)
  }
  return threads
}
