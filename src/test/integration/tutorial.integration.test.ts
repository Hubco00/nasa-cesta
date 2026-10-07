/**
 * Tutoriál proti lokálnemu Supabase. Test si vytvorí dočasný tutoriál aj
 * bežnú kapitolu a na konci ich zmaže — potom je všetko ako predtým.
 */
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'

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

describe.skipIf(!isLocalSupabaseUp)('tutoriál (lokálny Supabase)', () => {
  const player = makeClient()
  const admin = makeClient()
  let tutorialId = ''
  let otherChapterId = ''

  async function timelineIds(client = player): Promise<string[]> {
    const { data, error } = await client.rpc('get_my_timeline')
    expect(error).toBeNull()
    return (data ?? []).map((row) => row.chapter_id)
  }

  beforeAll(async () => {
    const [playerAuth, adminAuth] = await Promise.all([
      player.auth.signInWithPassword({ email: 'viki@nasa-cesta.local', password: '123' }),
      admin.auth.signInWithPassword({ email: 'hubco@nasa-cesta.local', password: '123' }),
    ])
    expect(playerAuth.error).toBeNull()
    expect(adminAuth.error).toBeNull()

    // Vlastná bežná kapitola — bez tutoriálu ju hráčka vidí hneď.
    const { data: other, error: otherError } = await admin
      .from('chapters')
      .insert({
        title: 'Test bežnej kapitoly',
        slug: `test-bezna-${Date.now()}`,
        order_index: 99_000,
        is_published: true,
        unlock_type: 'manual',
      })
      .select()
      .single()
    expect(otherError).toBeNull()
    otherChapterId = other!.id
    expect(await timelineIds()).toContain(otherChapterId)

    const { data, error } = await admin
      .from('chapters')
      .insert({
        title: 'Test tutoriálu',
        slug: `test-tutorial-${Date.now()}`,
        order_index: -99_000,
        is_published: true,
        is_tutorial: true,
        unlock_type: 'manual',
      })
      .select()
      .single()
    expect(error).toBeNull()
    tutorialId = data!.id
  })

  afterAll(async () => {
    if (tutorialId) await admin.rpc('admin_delete_chapter', { p_chapter_id: tutorialId })
    if (otherChapterId) {
      await admin.rpc('admin_delete_chapter', { p_chapter_id: otherChapterId })
    }
  })

  it('kým tutoriál nedokončí, vidí iba ten — ostatné kapitoly ani cez API', async () => {
    expect(await timelineIds()).toEqual([tutorialId])

    const { data: status } = await player.rpc('get_chapter_status', {
      p_chapter_id: otherChapterId,
    })
    expect(status).toBe('locked')

    const { data: view } = await player
      .from('chapters_player_view')
      .select('id')
      .eq('id', otherChapterId)
    expect(view).toEqual([])

    const { data: blocks } = await player
      .from('chapter_blocks')
      .select('id')
      .eq('chapter_id', otherChapterId)
    expect(blocks).toEqual([])
  })

  it('admin vidí všetky kapitoly aj počas tutoriálu', async () => {
    const ids = await timelineIds(admin)
    expect(ids).toContain(tutorialId)
    expect(ids).toContain(otherChapterId)
  })

  it('tutoriál nemôže na nič čakať ani byť finálnou kapitolou', async () => {
    const { error } = await admin
      .from('chapters')
      .update({ required_chapter_id: otherChapterId })
      .eq('id', tutorialId)
    expect(error).not.toBeNull()
    const final = await admin
      .from('chapters')
      .update({ is_final: true })
      .eq('id', tutorialId)
    expect(final.error).not.toBeNull()
  })

  it('po dokončení tutoriálu sa objavia ostatné kapitoly a tutoriál ostane splnený', async () => {
    const { error } = await player.rpc('complete_manual_step', {
      p_chapter_id: tutorialId,
    })
    expect(error).toBeNull()

    const ids = await timelineIds()
    expect(ids[0]).toBe(tutorialId)
    expect(ids).toContain(otherChapterId)

    const { data: timeline } = await player.rpc('get_my_timeline')
    const tutorial = timeline?.find((row) => row.chapter_id === tutorialId)
    expect(tutorial).toMatchObject({ is_tutorial: true, status: 'completed' })
  })
})
