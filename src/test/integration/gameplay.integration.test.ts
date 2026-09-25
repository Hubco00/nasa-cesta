/**
 * Integračné testy proti reálne bežiacemu lokálnemu Supabase stacku
 * (`npx supabase start`), nie proti mockom. Overujú, že RLS politiky a RPC
 * funkcie z `supabase/migrations/` sa naozaj správajú tak, ako majú —
 * napr. že hráčka nevie priamo meniť svoj postup alebo čítať cudzie tabuľky.
 *
 * Ak lokálny Supabase nebeží, testy sa preskočia (nezlyhá `npm run test`,
 * ktorý ich bežne nespúšťa — pozri `npm run test:integration` v README).
 */
import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Generované typy neoznačujú uuid parametre RPC funkcií ako nullable (Postgres
// samotný typ parametra nenesie informáciu o nullabilite) — pre jednoduché
// (nie kombinované) kapitoly sa `p_condition_id` posiela ako NULL, preto tu
// obchádzame typ vygenerovaný z DB schémy.
const NO_CONDITION = null as unknown as string

const CHAPTER_INTRO = '00000000-0000-0000-0000-000000000101'
const CHAPTER_QUESTION = '00000000-0000-0000-0000-000000000102'
const CHAPTER_QR = '00000000-0000-0000-0000-000000000103'
const CHAPTER_LOCATION = '00000000-0000-0000-0000-000000000104'
const PLAYER_ID = '22222222-2222-2222-2222-222222222222'

const isLocalSupabaseUp = await fetch(`${SUPABASE_URL}/auth/v1/health`)
  .then((res) => res.ok)
  .catch(() => false)

function makeClient() {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

describe.skipIf(!isLocalSupabaseUp)(
  'gameplay RLS/RPC (lokálny Supabase, seed dáta)',
  () => {
    const player = makeClient()
    const admin = makeClient()

    beforeAll(async () => {
      const [playerAuth, adminAuth] = await Promise.all([
        player.auth.signInWithPassword({
          email: 'player@example.com',
          password: 'local-dev-player',
        }),
        admin.auth.signInWithPassword({
          email: 'admin@example.com',
          password: 'local-dev-admin',
        }),
      ])
      expect(playerAuth.error).toBeNull()
      expect(adminAuth.error).toBeNull()

      // Deterministický východiskový stav bez ohľadu na poradie spúšťania súborov.
      const { error } = await admin.rpc('admin_reset_progress', {
        p_player_id: PLAYER_ID,
      })
      expect(error).toBeNull()
    })

    it('čerstvá hráčka (bez player_progress riadkov) vidí prvú kapitolu ako unlocked, nie locked', async () => {
      const { data: timeline, error } = await player.rpc('get_my_timeline')
      expect(error).toBeNull()
      const first = timeline?.find((row) => row.chapter_id === CHAPTER_INTRO)
      expect(first?.status).toBe('unlocked')

      const { data: status, error: statusError } = await player.rpc(
        'get_chapter_status',
        {
          p_chapter_id: CHAPTER_INTRO,
        },
      )
      expect(statusError).toBeNull()
      expect(status).toBe('unlocked')

      const second = timeline?.find((row) => row.chapter_id === CHAPTER_QUESTION)
      expect(second?.status).toBe('locked')
    })

    it('nepublikovaná kapitola sa hráčke nezobrazí', async () => {
      const draftId = crypto.randomUUID()
      const { error: insertError } = await admin.from('chapters').insert({
        id: draftId,
        title: 'Rozpracovaná kapitola',
        slug: `draft-${draftId}`,
        order_index: 999,
        is_published: false,
        unlock_type: 'manual',
      })
      expect(insertError).toBeNull()

      const { data: viewRows } = await player
        .from('chapters_player_view')
        .select('id')
        .eq('id', draftId)
      expect(viewRows).toEqual([])

      const { data: timeline } = await player.rpc('get_my_timeline')
      expect(timeline?.some((row) => row.chapter_id === draftId)).toBe(false)

      await admin.from('chapters').delete().eq('id', draftId)
    })

    it('hráčka nemá priamy SELECT na surovú tabuľku chapters ani zápis do player_progress', async () => {
      const { data: rawChapters, error: selectError } = await player
        .from('chapters')
        .select('id')
      expect(selectError).toBeNull()
      expect(rawChapters).toEqual([])

      const { error: insertError } = await player.from('player_progress').insert({
        player_id: PLAYER_ID,
        chapter_id: CHAPTER_INTRO,
        status: 'completed',
      })
      expect(insertError).not.toBeNull()
    })

    it('hráčka nemá prístup k admin RPC operáciám', async () => {
      const { error } = await player.rpc('admin_set_chapter_status', {
        p_player_id: PLAYER_ID,
        p_chapter_id: CHAPTER_INTRO,
        p_status: 'completed',
      })
      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/admin/i)
    })

    it('manuálna úvodná kapitola sa dá označiť ako splnená', async () => {
      const { data, error } = await player.rpc('complete_manual_step', {
        p_chapter_id: CHAPTER_INTRO,
      })
      expect(error).toBeNull()
      expect(data).toMatchObject({ completed: true })

      const { data: progress } = await player
        .from('player_progress')
        .select('status')
        .eq('chapter_id', CHAPTER_INTRO)
        .single()
      expect(progress?.status).toBe('completed')
    })

    it('nesprávna odpoveď necháva kapitolu zamknutú (nesplnenú)', async () => {
      const { data, error } = await player.rpc('verify_answer', {
        p_chapter_id: CHAPTER_QUESTION,
        p_condition_id: NO_CONDITION,
        p_answer: 'Praha',
      })
      expect(error).toBeNull()
      expect(data).toMatchObject({ correct: false })

      const { data: progress } = await player
        .from('player_progress')
        .select('status, attempt_count')
        .eq('chapter_id', CHAPTER_QUESTION)
        .single()
      expect(progress?.status).toBe('unlocked')
      expect(progress?.attempt_count).toBe(1)
    })

    it('správna odpoveď (case-insensitive) kapitolu odomkne a uloží postup', async () => {
      const { data, error } = await player.rpc('verify_answer', {
        p_chapter_id: CHAPTER_QUESTION,
        p_condition_id: NO_CONDITION,
        p_answer: '  bratislava  ',
      })
      expect(error).toBeNull()
      expect(data).toMatchObject({ correct: true })

      const { data: progress } = await player
        .from('player_progress')
        .select('status, attempt_count')
        .eq('chapter_id', CHAPTER_QUESTION)
        .single()
      expect(progress?.status).toBe('completed')
      expect(progress?.attempt_count).toBe(2)
    })

    it('QR token s neplatnou hodnotou sa odmietne a nezaloguje sa', async () => {
      const { data, error } = await player.rpc('verify_qr', {
        p_chapter_id: CHAPTER_QR,
        p_condition_id: NO_CONDITION,
        p_token: 'quest_invalid_token',
      })
      expect(error).toBeNull()
      expect(data).toMatchObject({ valid: false })

      const { count } = await player
        .from('qr_events')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', CHAPTER_QR)
      expect(count).toBe(0)
    })

    it('platný QR token kapitolu odomkne a zaloguje qr_event', async () => {
      const { data, error } = await player.rpc('verify_qr', {
        p_chapter_id: CHAPTER_QR,
        p_condition_id: NO_CONDITION,
        p_token: 'quest_8f3a1d0c_demo',
      })
      expect(error).toBeNull()
      expect(data).toMatchObject({ valid: true })

      const { count } = await player
        .from('qr_events')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', CHAPTER_QR)
      expect(count).toBe(1)
    })

    it('GPS stav: ďaleko od cieľa vráti too_far, na mieste vráti within_range', async () => {
      const far = await player.rpc('verify_location', {
        p_chapter_id: CHAPTER_LOCATION,
        p_condition_id: NO_CONDITION,
        p_lat: 48.1505,
        p_lng: 17.1,
        p_accuracy: 10,
      })
      expect(far.error).toBeNull()
      expect(far.data).toMatchObject({ status: 'too_far' })

      const near = await player.rpc('verify_location', {
        p_chapter_id: CHAPTER_LOCATION,
        p_condition_id: NO_CONDITION,
        p_lat: 48.1445,
        p_lng: 17.1,
        p_accuracy: 10,
      })
      expect(near.error).toBeNull()
      expect(near.data).toMatchObject({ status: 'within_range' })

      const { data: progress } = await player
        .from('player_progress')
        .select('status')
        .eq('chapter_id', CHAPTER_LOCATION)
        .single()
      expect(progress?.status).toBe('completed')
    })

    it('hráčka vidí bloky obsahu (text aj fotky) publikovanej kapitoly', async () => {
      // Regresný test: RLS politika na chapter_blocks nesmie interne
      // spoliehať na priamy subquery voči `chapters` (tá pre hráčku nemá
      // žiadnu SELECT politiku, takže by vždy vrátila 0 riadkov) — musí ísť
      // cez chapter_is_published().
      const { data: blocks, error } = await player
        .from('chapter_blocks')
        .select('id, block_type, storage_path')
        .eq('chapter_id', CHAPTER_INTRO)
      expect(error).toBeNull()
      expect(blocks?.length).toBeGreaterThan(0)
      expect(blocks?.some((b) => b.block_type === 'photo' && b.storage_path)).toBe(true)
    })
  },
)
