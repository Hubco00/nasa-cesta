/**
 * Kapitola po krokoch proti lokálnemu Supabase. Test si vytvorí vlastnú
 * dočasnú kapitolu s tromi krokmi a na konci ju zmaže (aj s postupom hráčky)
 * — dá sa spustiť aj nad rozpracovanou DB.
 */
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Námestie v Dolnom Kubíne.
const PLACE = { lat: 49.2098, lng: 19.2951 }

const isLocalSupabaseUp = await fetch(`${SUPABASE_URL}/auth/v1/health`)
  .then((res) => res.ok)
  .catch(() => false)

function makeClient() {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

describe.skipIf(!isLocalSupabaseUp)('kapitola po krokoch (lokálny Supabase)', () => {
  const player = makeClient()
  const admin = makeClient()
  let chapterId = ''
  let story = ''
  let walk = ''
  let photo = ''

  async function visibleSteps(): Promise<string[]> {
    const { data, error } = await player
      .from('chapter_blocks')
      .select('id')
      .eq('chapter_id', chapterId)
      .order('order_index')
    expect(error).toBeNull()
    return (data ?? []).map((row) => row.id)
  }

  beforeAll(async () => {
    const [playerAuth, adminAuth] = await Promise.all([
      player.auth.signInWithPassword({ email: 'viki@nasa-cesta.local', password: '123' }),
      admin.auth.signInWithPassword({ email: 'hubco@nasa-cesta.local', password: '123' }),
    ])
    expect(playerAuth.error).toBeNull()
    expect(adminAuth.error).toBeNull()

    const { data: chapter, error } = await admin
      .from('chapters')
      .insert({
        title: 'Test krokov',
        slug: `test-krokov-${Date.now()}`,
        order_index: 99_000,
        is_published: true,
        unlock_type: 'manual',
      })
      .select()
      .single()
    expect(error).toBeNull()
    chapterId = chapter!.id

    const insert = async (
      row: Database['public']['Tables']['chapter_blocks']['Insert'],
    ) => {
      const { data, error } = await admin
        .from('chapter_blocks')
        .insert(row)
        .select()
        .single()
      expect(error).toBeNull()
      return data!.id
    }
    story = await insert({
      chapter_id: chapterId,
      block_type: 'text',
      order_index: 10,
      body_markdown: 'Príď na námestie.',
    })
    walk = await insert({
      chapter_id: chapterId,
      block_type: 'text',
      order_index: 20,
      body_markdown: 'Si tu? Skontroluj polohu.',
      gate: 'location',
    })
    photo = await insert({
      chapter_id: chapterId,
      block_type: 'photo',
      order_index: 30,
      storage_path: 'integration-test/krok.png',
    })
    const { error: placeError } = await admin.from('chapter_answers').insert({
      block_id: walk,
      correct_answers: [],
      latitude: PLACE.lat,
      longitude: PLACE.lng,
      radius_meters: 300,
    })
    expect(placeError).toBeNull()
  })

  afterAll(async () => {
    if (chapterId) await admin.rpc('admin_delete_chapter', { p_chapter_id: chapterId })
  })

  it('hráčka vidí iba prvý krok a vie, koľko krokov kapitola má', async () => {
    expect(await visibleSteps()).toEqual([story])
    const { data } = await player.rpc('chapter_step_count', { p_chapter_id: chapterId })
    expect(data).toBe(3)
  })

  it('ďalší krok sa nedá preskočiť ani cez API', async () => {
    const skip = await player.rpc('complete_block_step', { p_block_id: photo })
    expect(skip.error).not.toBeNull()
    const internal = await player.rpc(
      'mark_block_step_passed' as never,
      {
        p_block_id: photo,
      } as never,
    )
    expect(internal.error).not.toBeNull()
    const early = await player.rpc('complete_manual_step', { p_chapter_id: chapterId })
    expect(early.error?.message).toContain('kroky kapitoly')
  })

  it('„Ďalej“ odomkne ďalší krok', async () => {
    const { error } = await player.rpc('complete_block_step', { p_block_id: story })
    expect(error).toBeNull()
    expect(await visibleSteps()).toEqual([story, walk])
  })

  it('krok s polohou sa nedá odkliknúť, iba overiť na mieste', async () => {
    const click = await player.rpc('complete_block_step', { p_block_id: walk })
    expect(click.error).not.toBeNull()

    const far = await player.rpc('verify_block_location', {
      p_block_id: walk,
      p_lat: 49.2266, // Žilina
      p_lng: 18.7448,
      p_accuracy: 20,
    })
    expect(far.error).toBeNull()
    expect(far.data).toMatchObject({ status: 'too_far' })
    expect((far.data as { distanceMeters: number }).distanceMeters).toBeGreaterThan(
      30_000,
    )
    expect(await visibleSteps()).toEqual([story, walk])

    // ~350 m od cieľa: mimo 300 m, ale v tolerancii vďaka nepresnosti GPS.
    const near = await player.rpc('verify_block_location', {
      p_block_id: walk,
      p_lat: PLACE.lat + 0.00315,
      p_lng: PLACE.lng,
      p_accuracy: 80,
    })
    expect(near.error).toBeNull()
    expect(near.data).toMatchObject({ status: 'within_range', distanceMeters: null })
    expect(await visibleSteps()).toEqual([story, walk, photo])
  })

  it('po poslednom kroku sa dá kapitola dokončiť', async () => {
    expect(
      (await player.rpc('complete_block_step', { p_block_id: photo })).error,
    ).toBeNull()
    const { data, error } = await player.rpc('complete_manual_step', {
      p_chapter_id: chapterId,
    })
    expect(error).toBeNull()
    expect(data).toMatchObject({ completed: true })
  })
})
