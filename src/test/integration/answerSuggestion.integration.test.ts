/**
 * „Je toto, čo si mala na mysli?“ proti lokálnemu Supabase. Test si vytvorí
 * dočasnú kapitolu s otázkami a na konci ju zmaže.
 */
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database, Json } from '../../types/database'

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const isLocalSupabaseUp = await fetch(`${SUPABASE_URL}/auth/v1/health`)
  .then((res) => res.ok)
  .catch(() => false)

function makeClient() {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

describe.skipIf(!isLocalSupabaseUp)('ponuka správnej odpovede (lokálny Supabase)', () => {
  const player = makeClient()
  const admin = makeClient()
  let chapterId = ''
  let offered = ''
  let plain = ''
  let choice = ''

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
        title: 'Test ponuky odpovede',
        slug: `test-ponuka-${Date.now()}`,
        order_index: 99_000,
        is_published: true,
        unlock_type: 'manual',
      })
      .select()
      .single()
    expect(error).toBeNull()
    chapterId = chapter!.id

    // Otázky v meste (nie kroky), aby boli všetky hneď dostupné.
    const { data: pin } = await admin
      .from('chapter_map_pins')
      .insert({ chapter_id: chapterId, city_key: 'zilina' })
      .select()
      .single()

    const question = async (config: Json, answers: string[]) => {
      const { data, error } = await admin
        .from('chapter_blocks')
        .insert({
          chapter_id: chapterId,
          map_pin_id: pin!.id,
          block_type: 'question',
          order_index: 10,
          body_markdown: 'Čo sme si dali ako prvé?',
          question_config: config,
        })
        .select()
        .single()
      expect(error).toBeNull()
      const answer = await admin
        .from('chapter_answers')
        .insert({ block_id: data!.id, correct_answers: answers })
      expect(answer.error).toBeNull()
      return data!.id
    }
    offered = await question({ type: 'text', offerCorrectAnswer: true }, ['kávu', 'káva'])
    plain = await question({ type: 'text' }, ['kávu'])
    choice = await question(
      { type: 'choice', options: ['Kávu', 'Čaj'], offerCorrectAnswer: true },
      ['Kávu'],
    )
  })

  afterAll(async () => {
    if (chapterId) await admin.rpc('admin_delete_chapter', { p_chapter_id: chapterId })
  })

  const accept = (id: string) =>
    player.rpc('accept_block_answer_suggestion', { p_block_id: id })

  it('bez predchádzajúcej zlej odpovede sa ponuka potvrdiť nedá', async () => {
    expect((await accept(offered)).error).not.toBeNull()
  })

  it('po zlej odpovedi príde prvá správna odpoveď a „Áno“ otázku vyrieši', async () => {
    const { data, error } = await player.rpc('verify_block_answer', {
      p_block_id: offered,
      p_answer: 'kapučíno',
    })
    expect(error).toBeNull()
    expect(data).toMatchObject({ correct: false, suggestion: 'kávu' })

    const accepted = await accept(offered)
    expect(accepted.error).toBeNull()
    expect(accepted.data).toMatchObject({ correct: true })

    const { data: progress } = await player
      .from('player_block_progress')
      .select('solved_at, last_correct')
      .eq('block_id', offered)
      .single()
    expect(progress?.solved_at).not.toBeNull()
    expect(progress?.last_correct).toBe(true)

    // Vyriešenú otázku už znova „potvrdiť“ nemožno.
    expect((await accept(offered)).error).not.toBeNull()
  })

  it('bez zapnutej ponuky správnu odpoveď nepošle ani nedovolí potvrdiť', async () => {
    const { data } = await player.rpc('verify_block_answer', {
      p_block_id: plain,
      p_answer: 'čaj',
    })
    expect(data).toMatchObject({ correct: false, suggestion: null })
    expect((await accept(plain)).error).not.toBeNull()
  })

  it('pri výbere z možností sa správna odpoveď neponúka', async () => {
    const { data } = await player.rpc('verify_block_answer', {
      p_block_id: choice,
      p_answer: 'Čaj',
    })
    expect(data).toMatchObject({ correct: false, suggestion: null })
    expect((await accept(choice)).error).not.toBeNull()
  })
})
