import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { ConversationMessage, ConversationSummary, ProfileLite } from '../types/database'
import { PROFILE_LITE } from './profiles.service'

export async function listConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('list_conversations')
  if (error) throw error
  return (data ?? []) as ConversationSummary[]
}

export async function startConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { p_other: otherUserId })
  if (error) throw error
  return data as string
}

export async function getConversationPartner(conversationId: string, myId: string): Promise<ProfileLite | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`id, a:profiles!user_a(${PROFILE_LITE}), b:profiles!user_b(${PROFILE_LITE})`)
    .eq('id', conversationId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as unknown as { a: ProfileLite; b: ProfileLite }
  return row.a?.id === myId ? row.b : row.a
}

export async function listConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) throw error
  return (data ?? []) as ConversationMessage[]
}

export async function sendConversationMessage(conversationId: string, senderId: string, body: string): Promise<ConversationMessage> {
  const { data, error } = await supabase
    .from('conversation_messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select('*')
    .single()
  if (error) throw error
  return data as ConversationMessage
}

export async function markConversationRead(conversationId: string) {
  const { error } = await supabase.rpc('mark_conversation_read', { p_conversation: conversationId })
  if (error) throw error
}

export async function getUnreadDmCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_dm_count')
  if (error) throw error
  return (data as number) ?? 0
}

export function subscribeToConversation(conversationId: string, onInsert: (m: ConversationMessage) => void): RealtimeChannel {
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as ConversationMessage),
    )
    .subscribe()
}

/** Any new DM I can see (RLS limits it to my conversations) — used for badges. */
export function subscribeToMyDms(userId: string, onInsert: (m: ConversationMessage) => void): RealtimeChannel {
  return supabase
    .channel(`dms:${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, (payload) =>
      onInsert(payload.new as ConversationMessage),
    )
    .subscribe()
}
