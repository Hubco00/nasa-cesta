import { describe, expect, it } from 'vitest'
import {
  contentTypeFor,
  isVideoFile,
  isVideoPath,
  mediaFileError,
  withFirstFrame,
} from './media'

function file(name: string, type: string, sizeMb: number): File {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: sizeMb * 1024 * 1024 })
  return f
}

describe('media', () => {
  it('rozpozná video podľa prípony uloženej cesty', () => {
    expect(isVideoPath('c/abc.mp4')).toBe(true)
    expect(isVideoPath('c/abc.MOV')).toBe(true)
    expect(isVideoPath('c/abc.jpg')).toBe(false)
    expect(isVideoPath(null)).toBe(false)
  })

  it('rozpozná video podľa typu súboru', () => {
    expect(isVideoFile(file('klip.mov', 'video/quicktime', 1))).toBe(true)
    expect(isVideoFile(file('fotka.jpg', 'image/jpeg', 1))).toBe(false)
  })

  it('stráži typ a veľkosť (fotka 10 MB, video 50 MB)', () => {
    expect(mediaFileError(file('fotka.jpg', 'image/jpeg', 3))).toBeNull()
    expect(mediaFileError(file('fotka.jpg', 'image/jpeg', 12))).toContain('10 MB')
    expect(mediaFileError(file('klip.mp4', 'video/mp4', 30))).toBeNull()
    expect(mediaFileError(file('klip.mp4', 'video/mp4', 60))).toContain('50 MB')
    expect(mediaFileError(file('dokument.pdf', 'application/pdf', 1))).toContain(
      'nie je fotka ani video',
    )
  })

  it('pridá k URL videa skok na prvý snímok iba raz', () => {
    expect(withFirstFrame('https://x/v.mp4?token=1')).toBe(
      'https://x/v.mp4?token=1#t=0.001',
    )
    expect(withFirstFrame('https://x/v.mp4#t=2')).toBe('https://x/v.mp4#t=2')
  })

  it('doplní MIME typ podľa prípony, keď ho prehliadač nevyplní', () => {
    expect(contentTypeFor(file('klip.mov', '', 1))).toBe('video/quicktime')
    expect(contentTypeFor(file('klip.mp4', 'video/mp4', 1))).toBe('video/mp4')
  })
})
