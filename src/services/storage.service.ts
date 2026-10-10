import { supabase } from '../lib/supabase'

const AVATARS_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5MB
// The storage bucket enforces the same list server-side. SVG is left out on
// purpose: an SVG file can carry scripts.
const AVATAR_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = AVATAR_TYPES[file.type]
  if (!ext) {
    throw new Error('Please choose a PNG, JPG, WebP or GIF image.')
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Image must be under 5MB.')
  }

  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
  // Cache-bust so a re-uploaded avatar shows immediately instead of the cached old image.
  return `${data.publicUrl}?t=${Date.now()}`
}
