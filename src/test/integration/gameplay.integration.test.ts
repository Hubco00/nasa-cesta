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

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? 'http://127.0.0.1:54321'
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
          email: 'viki@nasa-cesta.local',
          password: '123',
        }),
        admin.auth.signInWithPassword({
          email: 'hubco@nasa-cesta.local',
          password: '123',
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

    it('zamknutá kapitola: API neprezradí názov, obsah ani miesta na mape', async () => {
      const { data: timeline } = await player.rpc('get_my_timeline')
      const locked = timeline?.find((row) => row.chapter_id === CHAPTER_QUESTION)
      expect(locked?.status).toBe('locked')
      expect(locked?.title).toBeNull()
      expect(locked?.slug).toBeNull()

      const { data: view } = await player
        .from('chapters_player_view')
        .select('id')
        .eq('id', CHAPTER_QUESTION)
      expect(view).toEqual([])

      const { data: blocks } = await player
        .from('chapter_blocks')
        .select('id')
        .eq('chapter_id', CHAPTER_QUESTION)
      expect(blocks).toEqual([])

      const { data: pins } = await player
        .from('chapter_map_pins')
        .select('id')
        .eq('chapter_id', CHAPTER_QUESTION)
      expect(pins).toEqual([])
    })

    it('otázka v obsahu: server overí odpoveď, list a fotku-odmenu vydá až po odpovedi', async () => {
      const QUESTION_BLOCK = '00000000-0000-0000-0000-000000000215'
      const outcome = (result: 'correct' | 'wrong') =>
        player
          .from('chapter_blocks')
          .select('id, body_markdown, storage_path')
          .eq('parent_block_id', QUESTION_BLOCK)
          .eq('reveal_on', result)
      const rewardPhoto = () =>
        player.storage.from('chapter-photos').createSignedUrl('seed/reward.png', 60)

      // Skrytá kapitola čaká na správnu odpoveď — dovtedy ju API vôbec nevráti.
      const HIDDEN_CHAPTER = '00000000-0000-0000-0000-000000000106'
      const timelineHas = async (id: string) =>
        (await player.rpc('get_my_timeline')).data?.find((r) => r.chapter_id === id)
      expect(await timelineHas(HIDDEN_CHAPTER)).toBeUndefined()

      // Pred odpoveďou: žiadny list ani fotka-odmena (list by prezradil odpoveď).
      expect((await outcome('correct')).data).toEqual([])
      expect((await outcome('wrong')).data).toEqual([])
      expect((await rewardPhoto()).error).not.toBeNull()

      const wrong = await player.rpc('verify_block_answer', {
        p_block_id: QUESTION_BLOCK,
        p_answer: 'Čaj',
      })
      expect(wrong.error).toBeNull()
      expect(wrong.data).toMatchObject({ correct: false, unlockedChapters: [] })
      expect(await timelineHas(HIDDEN_CHAPTER)).toBeUndefined()
      expect((await outcome('wrong')).data).toHaveLength(1)
      expect((await outcome('correct')).data).toEqual([])
      expect((await rewardPhoto()).error).not.toBeNull()

      const right = await player.rpc('verify_block_answer', {
        p_block_id: QUESTION_BLOCK,
        p_answer: '  kávu ',
      })
      expect(right.data).toMatchObject({
        correct: true,
        unlockedChapters: [{ title: 'Tajná kapitola', slug: 'tajna-kapitola' }],
      })
      expect((await timelineHas(HIDDEN_CHAPTER))?.status).toBe('unlocked')
      const correctLetter = (await outcome('correct')).data
      expect(correctLetter?.[0]?.body_markdown).toContain('kávu')
      expect(correctLetter?.[0]?.storage_path).toBe('seed/reward.png')
      expect((await outcome('wrong')).data).toEqual([])
      expect((await rewardPhoto()).error).toBeNull()

      const { data: progress } = await player
        .from('player_block_progress')
        .select('solved_at, attempt_count')
        .eq('block_id', QUESTION_BLOCK)
        .single()
      expect(progress?.solved_at).not.toBeNull()
      expect(progress?.attempt_count).toBe(2)

      const { data: playerAnswers } = await player
        .from('chapter_answers')
        .select('correct_answers')
        .eq('block_id', QUESTION_BLOCK)
      expect(playerAnswers).toEqual([])

      const { data: adminAnswers } = await admin
        .from('chapter_answers')
        .select('correct_answers')
        .eq('block_id', QUESTION_BLOCK)
        .single()
      expect(adminAnswers?.correct_answers).toEqual(['Kávu'])
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
    it('miesta na mape: rovnaké mesto má v každej kapitole vlastný obsah', async () => {
      // Po predchádzajúcich testoch sú kapitoly 1 aj 2 splnené, teda prístupné.
      const { data: introPins } = await player
        .from('chapter_map_pins')
        .select('id, city_key')
        .eq('chapter_id', CHAPTER_INTRO)
      expect(introPins?.map((p) => p.city_key).sort()).toEqual(['dolny_kubin', 'zilina'])

      const { data: questionPins } = await player
        .from('chapter_map_pins')
        .select('id, city_key')
        .eq('chapter_id', CHAPTER_QUESTION)
      expect(questionPins?.map((p) => p.city_key)).toEqual(['zilina'])

      const introZilina = introPins!.find((p) => p.city_key === 'zilina')!
      const questionZilina = questionPins![0]
      const [a, b] = await Promise.all([
        player
          .from('chapter_blocks')
          .select('body_markdown')
          .eq('map_pin_id', introZilina.id),
        player
          .from('chapter_blocks')
          .select('body_markdown')
          .eq('map_pin_id', questionZilina.id),
      ])
      const textA = a.data?.map((r) => r.body_markdown).join(' ')
      const textB = b.data?.map((r) => r.body_markdown).join(' ')
      expect(textA).toContain('prvú')
      expect(textB).toContain('druhú')

      const { data: mainStory } = await player
        .from('chapter_blocks')
        .select('id')
        .eq('chapter_id', CHAPTER_INTRO)
        .is('map_pin_id', null)
      expect(mainStory?.map((r) => r.id).sort()).toEqual([
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000202',
      ])
    })
    it('mapa kapitol: polohy a cestu nastavuje iba admin, hráčka ich iba číta', async () => {
      const { error: posError } = await admin
        .from('chapters')
        .update({ map_x: 120, map_y: 90 })
        .eq('id', CHAPTER_INTRO)
      expect(posError).toBeNull()
      const { data: seg, error: segError } = await admin
        .from('chapter_map_segments')
        .insert({
          from_chapter_id: CHAPTER_INTRO,
          to_chapter_id: CHAPTER_QUESTION,
          curve: 0.5,
        })
        .select()
        .single()
      expect(segError).toBeNull()

      const { data: timeline } = await player.rpc('get_my_timeline')
      const intro = timeline?.find((row) => row.chapter_id === CHAPTER_INTRO)
      expect(intro?.map_x).toBe(120)
      expect(intro?.map_y).toBe(90)

      const { data: segments } = await player
        .from('chapter_map_segments')
        .select('id, curve')
      expect(segments).toEqual([{ id: seg!.id, curve: 0.5 }])

      const { error: insertError } = await player
        .from('chapter_map_segments')
        .insert({ from_chapter_id: CHAPTER_QUESTION, to_chapter_id: CHAPTER_QR })
      expect(insertError).not.toBeNull()

      await player.from('chapter_map_segments').update({ curve: -1 }).eq('id', seg!.id)
      const { data: unchanged } = await admin
        .from('chapter_map_segments')
        .select('curve')
        .eq('id', seg!.id)
        .single()
      expect(unchanged?.curve).toBe(0.5)

      await admin.from('chapter_map_segments').delete().eq('id', seg!.id)
      await admin
        .from('chapters')
        .update({ map_x: null, map_y: null })
        .eq('id', CHAPTER_INTRO)
    })
    it('mazanie kapitoly: nadväzujúca sa napojí na predchodcu, závislosť na otázke zmazanie zastaví', async () => {
      const denied = await player.rpc('admin_delete_chapter', {
        p_chapter_id: CHAPTER_INTRO,
      })
      expect(denied.error).not.toBeNull()

      // Na otázku v kapitole 1 čaká skrytá kapitola → zmazať nejde.
      const blocked = await admin.rpc('admin_delete_chapter', {
        p_chapter_id: CHAPTER_INTRO,
      })
      expect(blocked.error?.message).toContain('Tajná kapitola')

      const [a, b, c] = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
      const chapter = (id: string, required: string | null, order: number) => ({
        id,
        title: `Test ${order}`,
        slug: `test-${id}`,
        order_index: 900 + order,
        is_published: false,
        unlock_type: 'manual',
        required_chapter_id: required,
      })
      expect((await admin.from('chapters').insert(chapter(a, null, 1))).error).toBeNull()
      expect((await admin.from('chapters').insert(chapter(b, a, 2))).error).toBeNull()
      expect((await admin.from('chapters').insert(chapter(c, b, 3))).error).toBeNull()
      await admin.from('chapter_blocks').insert({
        chapter_id: b,
        block_type: 'photo',
        storage_path: 'test/fake.png',
      })

      const deleted = await admin.rpc('admin_delete_chapter', { p_chapter_id: b })
      expect(deleted.error).toBeNull()
      expect(deleted.data).toEqual(['test/fake.png'])

      const { data: relinked } = await admin
        .from('chapters')
        .select('required_chapter_id')
        .eq('id', c)
        .single()
      expect(relinked?.required_chapter_id).toBe(a)

      await admin.from('chapters').delete().in('id', [a, c])
    })
  },
)
