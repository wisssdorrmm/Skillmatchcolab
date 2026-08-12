import { supabase } from '../lib/supabase'

export async function requestAccountDeletion(userId: string, reason: string) {
  const { error } = await supabase
    .from('account_deletion_requests')
    .insert({ user_id: userId, reason: reason || null })
  if (error) throw error
}
