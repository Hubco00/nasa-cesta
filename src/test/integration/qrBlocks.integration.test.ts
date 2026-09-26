/**
 * QR kód v obsahu kapitoly proti lokálnemu Supabase. Test si vytvorí vlastný
 * QR blok v úvodnej kapitole a na konci ho zmaže (aj s postupom hráčky k nemu)
 * — nemení ostatné dáta ani postup, dá sa preto spustiť aj nad rozpracovanou DB.
 */
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const CHAPTER_INTRO = '00000000-0000-0000-0000-000000000101'
const TOKEN = 'quest_integration_test_qr'

const isLocalSupabaseUp = await fetch(`${SUPABASE_URL}/auth/v1/health`)
  .then((res) => res.ok)
  .catch(() => false)

function makeClient() {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

describe.skipIf(!isLocalSupabaseUp)('QR kód v obsahu (lokálny Supabase)', () => {
  const player = makeClient()
  const admin = makeClient()
  let qrId = ''
  let storyId = ''
  let photoId = ''

  async function visibleToPlayer(): Promise<string[]> {
    const { data, error } = await player
      .from('chapter_blocks')
      .select('id')
      .in('id', [qrId, storyId, photoId])
    expect(error).toBeNull()
    return (data ?? []).map((row) => row.id).sort()
  }

  beforeAll(async () => {
    const [playerAuth, adminAuth] = await Promise.all([
      player.auth.signInWithPassword({ email: 'viki@nasa-cesta.local', password: '123' }),
      admin.auth.signInWithPassword({ email: 'hubco@nasa-cesta.local', password: '123' }),
    ])
    expect(playerAuth.error).toBeNull()
    expect(adminAuth.error).toBeNull()

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
    qrId = await insert({
      chapter_id: CHAPTER_INTRO,
      block_type: 'qr',
      order_index: 99_000,
      title: 'Test QR',
      body_markdown: 'Hľadaj pod lavičkou.',
    })
    storyId = await insert({
      chapter_id: CHAPTER_INTRO,
      parent_block_id: qrId,
      block_type: 'text',
      order_index: 10,
      body_markdown: 'Tajný príbeh za QR kódom.',
    })
    photoId = await insert({
      chapter_id: CHAPTER_INTRO,
      parent_block_id: storyId,
      block_type: 'photo',
      order_index: 10,
      storage_path: 'integration-test/neexistuje.png',
    })
  })

  afterAll(async () => {
    if (qrId) await admin.from('chapter_blocks').delete().eq('id', qrId)
  })

  it('token nastaví iba admin a hráčka nevidí ani jeho hash', async () => {
    const denied = await player.rpc('admin_set_block_qr_token', {
      p_block_id: qrId,
      p_token: TOKEN,
    })
    expect(denied.error).not.toBeNull()

    const { error } = await admin.rpc('admin_set_block_qr_token', {
      p_block_id: qrId,
      p_token: TOKEN,
    })
    expect(error).toBeNull()

    const { data: adminRows } = await admin
      .from('chapter_block_qr_tokens')
      .select('token_hash')
      .eq('block_id', qrId)
    expect(adminRows).toHaveLength(1)
    expect(adminRows![0].token_hash).not.toContain(TOKEN)

    const { data: playerRows } = await player
      .from('chapter_block_qr_tokens')
      .select('*')
      .eq('block_id', qrId)
    expect(playerRows).toEqual([])
  })

  it('QR kód nemôže byť vnorený pod iný blok', async () => {
    const { error } = await admin.from('chapter_blocks').insert({
      chapter_id: CHAPTER_INTRO,
      parent_block_id: storyId,
      block_type: 'qr',
      order_index: 20,
    })
    expect(error).not.toBeNull()
  })

  it('pred naskenovaním vidí hráčka iba QR blok, nie obsah pod ním (ani fotky príbehu)', async () => {
    expect(await visibleToPlayer()).toEqual([qrId])
  })

  it('nesprávny QR kód obsah neodomkne', async () => {
    const { data, error } = await player.rpc('verify_block_qr', {
      p_block_id: qrId,
      p_token: 'quest_nieco_ine',
    })
    expect(error).toBeNull()
    expect(data).toEqual({ valid: false })
    expect(await visibleToPlayer()).toEqual([qrId])
  })

  it('správny QR kód odomkne celý obsah pod ním a zaloguje qr_event', async () => {
    const { data, error } = await player.rpc('verify_block_qr', {
      p_block_id: qrId,
      p_token: `  ${TOKEN}\n`,
    })
    expect(error).toBeNull()
    expect(data).toEqual({ valid: true })
    expect(await visibleToPlayer()).toEqual([qrId, storyId, photoId].sort())

    const { data: events } = await player
      .from('qr_events')
      .select('block_id')
      .eq('block_id', qrId)
    expect(events).toHaveLength(1)

    const { data: progress } = await player
      .from('player_block_progress')
      .select('solved_at')
      .eq('block_id', qrId)
      .single()
    expect(progress?.solved_at).not.toBeNull()
  })
})
