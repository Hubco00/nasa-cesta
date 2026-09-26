/**
 * Otázka s odpoveďou „miesto na mape“ proti lokálnemu Supabase. Test si
 * vytvorí vlastnú otázku v dočasnej kapitole a na konci ju zmaže (aj s
 * odpoveďou a postupom hráčky) — dá sa spustiť aj nad rozpracovanou DB.
 */
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Železničná stanica Žilina.
const TARGET = { lat: 49.22655, lng: 18.74478 }

const isLocalSupabaseUp = await fetch(`${SUPABASE_URL}/auth/v1/health`)
  .then((res) => res.ok)
  .catch(() => false)

function makeClient() {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

describe.skipIf(!isLocalSupabaseUp)('otázka — miesto na mape (lokálny Supabase)', () => {
  const player = makeClient()
  const admin = makeClient()
  let chapterId = ''
  let questionId = ''

  beforeAll(async () => {
    const [playerAuth, adminAuth] = await Promise.all([
      player.auth.signInWithPassword({ email: 'viki@nasa-cesta.local', password: '123' }),
      admin.auth.signInWithPassword({ email: 'hubco@nasa-cesta.local', password: '123' }),
    ])
    expect(playerAuth.error).toBeNull()
    expect(adminAuth.error).toBeNull()

    // Vlastná dočasná kapitola — v existujúcej by bol blok až za jej krokmi.
    const { data: chapter, error: chapterError } = await admin
      .from('chapters')
      .insert({
        title: 'Test miesta',
        slug: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        order_index: 99_000,
        is_published: true,
        unlock_type: 'manual',
      })
      .select()
      .single()
    expect(chapterError).toBeNull()
    chapterId = chapter!.id

    const { data, error } = await admin
      .from('chapter_blocks')
      .insert({
        chapter_id: chapterId,
        block_type: 'question',
        order_index: 99_000,
        body_markdown: 'Kde sme sa prvýkrát videli?',
        question_config: { type: 'place' },
      })
      .select()
      .single()
    expect(error).toBeNull()
    questionId = data!.id

    const { error: answerError } = await admin.from('chapter_answers').insert({
      block_id: questionId,
      correct_answers: [],
      latitude: TARGET.lat,
      longitude: TARGET.lng,
      radius_meters: 250,
    })
    expect(answerError).toBeNull()
  })

  afterAll(async () => {
    if (chapterId) await admin.rpc('admin_delete_chapter', { p_chapter_id: chapterId })
  })

  it('hráčka nevidí súradnice správneho miesta', async () => {
    const { data } = await player
      .from('chapter_answers')
      .select('*')
      .eq('block_id', questionId)
    expect(data).toEqual([])
  })

  it('miesto ďaleko od cieľa je zlá odpoveď so zaokrúhlenou vzdialenosťou', async () => {
    // Dolný Kubín — asi 30 km od Žiliny.
    const { data, error } = await player.rpc('verify_block_place', {
      p_block_id: questionId,
      p_lat: 49.2098,
      p_lng: 19.2951,
    })
    expect(error).toBeNull()
    const result = data as { correct: boolean; distanceMeters: number }
    expect(result.correct).toBe(false)
    expect(result.distanceMeters % 1000).toBe(0)
    expect(result.distanceMeters).toBeGreaterThan(30_000)
    expect(result.distanceMeters).toBeLessThan(50_000)
  })

  it('textová odpoveď na otázku s miestom sa odmietne', async () => {
    const { error } = await player.rpc('verify_block_answer', {
      p_block_id: questionId,
      p_answer: 'Žilina',
    })
    expect(error?.message).toContain('miestom na mape')
  })

  it('miesto v tolerancii je správna odpoveď a otázka zostane vyriešená', async () => {
    const { data, error } = await player.rpc('verify_block_place', {
      p_block_id: questionId,
      p_lat: TARGET.lat + 0.001, // ~110 m severne
      p_lng: TARGET.lng,
    })
    expect(error).toBeNull()
    expect(data).toMatchObject({ correct: true, distanceMeters: null })

    const { data: progress } = await player
      .from('player_block_progress')
      .select('solved_at')
      .eq('block_id', questionId)
      .single()
    expect(progress?.solved_at).not.toBeNull()
  })

  it('neplatné súradnice sa odmietnu', async () => {
    const { error } = await player.rpc('verify_block_place', {
      p_block_id: questionId,
      p_lat: 123,
      p_lng: 18,
    })
    expect(error).not.toBeNull()
  })
})
