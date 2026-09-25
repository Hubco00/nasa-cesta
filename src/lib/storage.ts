import { supabase } from './supabase'

const BUCKET = 'chapter-photos'
const SIGNED_URL_TTL_SECONDS = 300

export async function getSignedPhotoUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error) return null
  return data.signedUrl
}

export async function getSignedPhotoUrls(
  storagePaths: string[],
): Promise<Record<string, string>> {
  if (storagePaths.length === 0) return {}
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return {}

  const result: Record<string, string> = {}
  for (const item of data) {
    if (item.signedUrl && item.path) result[item.path] = item.signedUrl
  }
  return result
}

/** Admin-only: nahrá fotku do privátneho bucketu, vráti storage_path pre chapter_blocks. */
export async function uploadChapterPhoto(chapterId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${chapterId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error

  return path
}
