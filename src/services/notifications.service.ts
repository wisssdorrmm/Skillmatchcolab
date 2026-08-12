import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Notification {
  id: string
  user_id: string
  type: 'application_received' | 'application_status' | 'direct_message'
  title: string
  body: string | null
  project_id: string | null
  is_read: boolean
  created_at: string
}

export async function listNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
  return count ?? 0
}

export async function markAsRead(notificationId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)
  if (error) throw error
}

export async function markAllAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
}

export function subscribeToNotifications(
  userId: string,
  onInsert: (n: Notification) => void
): RealtimeChannel {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new as Notification)
    )
    .subscribe()
}
