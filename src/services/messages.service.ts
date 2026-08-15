import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Message } from '../types/database'

export interface MessageWithSender extends Message {
  sender: { id: string; name: string | null; avatar_url: string | null } | null
}

export async function listMessages(projectId: string): Promise<MessageWithSender[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(id, name, avatar_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as MessageWithSender[]
}

export async function sendMessage(
  projectId: string,
  senderId: string,
  text: string
): Promise<MessageWithSender> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ project_id: projectId, sender_id: senderId, text })
    .select('*, sender:profiles!sender_id(id, name, avatar_url)')
    .single()
  if (error) throw error
  return data as unknown as MessageWithSender
}

export function subscribeToMessages(
  projectId: string,
  onInsert: (message: Message) => void
): RealtimeChannel {
  return supabase
    .channel(`messages:${projectId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${projectId}` },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe()
}
