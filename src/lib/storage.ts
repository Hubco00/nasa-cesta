import { contentTypeFor, isVideoFile } from './media'
import { supabase } from './supabase'

const BUCKET = 'chapter-photos'
// Podpísaná URL sa znovu používa, kým jej neostane menej ako deň — rovnaká URL
// = prehliadač a service worker fotku nestiahnu znova (každé stiahnutie sa
// v Supabase ráta do egressu, na Free pláne 5 GB mesačne).
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60
const SIGNED_URL_MIN_LEFT_MS = 24 * 60 * 60 * 1000
// Podľa projektu — po presune na iný Supabase projekt sa staré URL nepoužijú.
const URL_CACHE_KEY = `signed-photo-urls:${import.meta.env.VITE_SUPABASE_URL ?? ''}`

type UrlCache = Record<string, { url: string; expiresAt: number }>

let urlCache: UrlCache | null = null

function loadUrlCache(): UrlCache {
  if (urlCache) return urlCache
  try {
    urlCache = JSON.parse(localStorage.getItem(URL_CACHE_KEY) ?? '{}') as UrlCache
  } catch {
    urlCache = {}
  }
  return urlCache
}

function saveUrlCache(cache: UrlCache) {
  const now = Date.now()
  for (const [path, entry] of Object.entries(cache)) {
    if (entry.expiresAt <= now) delete cache[path]
  }
  try {
    localStorage.setItem(URL_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // bez localStorage ostane cache iba v pamäti
  }
}

/** Pri odhlásení — URL neostanú v zariadení po inom účte. */
export function clearSignedUrlCache() {
  urlCache = {}
  try {
    localStorage.removeItem(URL_CACHE_KEY)
  } catch {
    // nevadí
  }
}

export async function getSignedPhotoUrl(storagePath: string): Promise<string | null> {
  const urls = await getSignedPhotoUrls([storagePath])
  return urls[storagePath] ?? null
}

export async function getSignedPhotoUrls(
  storagePaths: string[],
  { fresh = false }: { fresh?: boolean } = {},
): Promise<Record<string, string>> {
  if (storagePaths.length === 0) return {}
  const cache = loadUrlCache()
  const validUntil = Date.now() + SIGNED_URL_MIN_LEFT_MS

  const result: Record<string, string> = {}
  const missing: string[] = []
  for (const path of new Set(storagePaths)) {
    const entry = cache[path]
    if (!fresh && entry && entry.expiresAt > validUntil) result[path] = entry.url
    else missing.push(path)
  }
  if (missing.length === 0) return result

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(missing, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return result

  const expiresAt = Date.now() + SIGNED_URL_TTL_SECONDS * 1000
  for (const item of data) {
    if (!item.signedUrl || !item.path) continue
    result[item.path] = item.signedUrl
    cache[item.path] = { url: item.signedUrl, expiresAt }
  }
  saveUrlCache(cache)
  return result
}

/**
 * Admin-only: nahrá fotku alebo video do privátneho bucketu, vráti storage_path
 * pre chapter_blocks. Prípona sa zachová — podľa nej sa video spozná pri zobrazení.
 */
export async function uploadChapterPhoto(chapterId: string, file: File): Promise<string> {
  const ext =
    file.name.split('.').pop()?.toLowerCase() || (isVideoFile(file) ? 'mp4' : 'jpg')
  const path = `${chapterId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: contentTypeFor(file),
    // Cesta je unikátna (UUID) a súbor sa nikdy nemení — prehliadač ho môže
    // držať v cache rok a nesťahovať znova.
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error

  return path
}

/** Admin-only: zmaže súbory fotiek (pri mazaní blokov, aby v Storage neostávali siroty). */
export async function removeChapterPhotos(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return
  await supabase.storage.from(BUCKET).remove(storagePaths)
}
