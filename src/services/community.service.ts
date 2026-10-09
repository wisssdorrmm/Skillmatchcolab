import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { CommunityMessage, CommunityRoom } from '../types/database'

const MESSAGE_SELECT =
  '*, author:profiles!user_id(id, name, avatar_url, username, primary_role, last_seen_at, show_online, is_verified, is_official), likes:community_message_likes(user_id), reply:reply_to(id, body, author:profiles!user_id(name))'

export async function listRooms(): Promise<CommunityRoom[]> {
  const { data, error } = await supabase.rpc('list_rooms')
  if (error) throw error
  return (data ?? []) as CommunityRoom[]
}

export async function getRoomBySlug(slug: string): Promise<CommunityRoom | null> {
  const { data, error } = await supabase.from('community_rooms').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data as CommunityRoom | null
}

export async function listRoomMessages(roomId: string, before?: string, limit = 50): Promise<CommunityMessage[]> {
  let query = supabase.from('community_messages').select(MESSAGE_SELECT).eq('room_id', roomId).order('created_at', { ascending: false }).limit(limit)
  if (before) query = query.lt('created_at', before)
  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as unknown as CommunityMessage[]).reverse()
}

export async function getRoomMessage(id: string): Promise<CommunityMessage | null> {
  const { data, error } = await supabase.from('community_messages').select(MESSAGE_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data as unknown as CommunityMessage | null
}

export async function postRoomMessage(roomId: string, userId: string, body: string, replyTo?: string | null): Promise<CommunityMessage> {
  const { data, error } = await supabase
    .from('community_messages')
    .insert({ room_id: roomId, user_id: userId, body, reply_to: replyTo ?? null })
    .select(MESSAGE_SELECT)
    .single()
  if (error) throw error
  return data as unknown as CommunityMessage
}

export async function deleteRoomMessage(id: string) {
  const { error } = await supabase.from('community_messages').delete().eq('id', id)
  if (error) throw error
}

export async function setMessageLike(messageId: string, userId: string, on: boolean) {
  if (on) {
    const { error } = await supabase.from('community_message_likes').insert({ message_id: messageId, user_id: userId })
    if (error && error.code !== '23505') throw error
  } else {
    const { error } = await supabase.from('community_message_likes').delete().eq('message_id', messageId).eq('user_id', userId)
    if (error) throw error
  }
}

export async function markRoomRead(roomId: string) {
  const { error } = await supabase.rpc('mark_room_read', { p_room: roomId })
  if (error) throw error
}

export function subscribeToRoom(
  roomId: string,
  handlers: { onInsert: (id: string) => void; onDelete: (id: string) => void },
): RealtimeChannel {
  return supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `room_id=eq.${roomId}` }, (payload) =>
      handlers.onInsert((payload.new as { id: string }).id),
    )
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_messages' }, (payload) =>
      handlers.onDelete((payload.old as { id: string }).id),
    )
    .subscribe()
}

export interface RecentPost {
  id: string
  body: string
  created_at: string
  author: { id: string; name: string | null; avatar_url: string | null } | null
  room: { slug: string; name: string } | null
}

export async function listRecentPosts(limit = 5): Promise<RecentPost[]> {
  const { data, error } = await supabase
    .from('community_messages')
    .select('id, body, created_at, author:profiles!user_id(id, name, avatar_url), room:community_rooms(slug, name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as RecentPost[]
}
