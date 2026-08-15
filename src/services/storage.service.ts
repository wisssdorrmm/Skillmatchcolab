import { supabase } from '../lib/supabase'

const AVATARS_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5MB

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Image must be under 5MB.')
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600' })

  if (error) throw error

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
  // Cache-bust so a re-uploaded avatar shows immediately instead of the cached old image.
  return `${data.publicUrl}?t=${Date.now()}`
}
