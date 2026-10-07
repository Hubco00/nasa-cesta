/** Fotky aj krátke videá — všade, kde sa dá nahrať fotka, dá sa aj video. */
export const MEDIA_ACCEPT =
  'image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime'

export const MAX_IMAGE_MB = 10
export const MAX_VIDEO_MB = 50

const VIDEO_EXTENSIONS = /\.(mp4|m4v|webm|mov)$/i

/** Video podľa uloženej cesty (prípona sa zachováva pri nahratí). */
export function isVideoPath(path: string | null | undefined): boolean {
  return Boolean(path && VIDEO_EXTENSIONS.test(path))
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || VIDEO_EXTENSIONS.test(file.name)
}

/** Chyba pre admina ešte pred nahratím (typ alebo veľkosť), inak null. */
export function mediaFileError(file: File): string | null {
  const video = isVideoFile(file)
  if (!video && !file.type.startsWith('image/')) {
    return `„${file.name}“ nie je fotka ani video.`
  }
  const limit = video ? MAX_VIDEO_MB : MAX_IMAGE_MB
  if (file.size > limit * 1024 * 1024) {
    return video
      ? `Video „${file.name}“ je väčšie ako ${limit} MB — skráť ho alebo ho nahraj v nižšej kvalite.`
      : `Fotka „${file.name}“ je väčšia ako ${limit} MB.`
  }
  return null
}

/**
 * Pre <video>: iOS Safari bez tohto nezobrazí prvý snímok ako náhľad,
 * kým sa video nespustí.
 */
export function withFirstFrame(url: string): string {
  return url.includes('#') ? url : `${url}#t=0.001`
}

const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

/** MIME typ na nahratie — niektoré prehliadače ho pri .mov nevyplnia. */
export function contentTypeFor(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return TYPE_BY_EXTENSION[ext] ?? 'application/octet-stream'
}
