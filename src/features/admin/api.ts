import { supabase } from '../../lib/supabase'
import type { Database } from '../../types/database'

export type ChapterRow = Database['public']['Tables']['chapters']['Row']
export type ChapterInsert = Database['public']['Tables']['chapters']['Insert']
export type ChapterUpdate = Database['public']['Tables']['chapters']['Update']
export type ChapterBlockRow = Database['public']['Tables']['chapter_blocks']['Row']
export type ChapterBlockInsert = Database['public']['Tables']['chapter_blocks']['Insert']
export type UnlockConditionRow =
  Database['public']['Tables']['chapter_unlock_conditions']['Row']
export type UnlockConditionInsert =
  Database['public']['Tables']['chapter_unlock_conditions']['Insert']
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type PlayerProgressRow = Database['public']['Tables']['player_progress']['Row']

function asRpcUuid(id: string | null): string {
  return id as unknown as string
}

// --- Kapitoly ---------------------------------------------------------

export async function adminListChapters(): Promise<ChapterRow[]> {
  const { data, error } = await supabase.from('chapters').select('*').order('order_index')
  if (error) throw error
  return data ?? []
}

export async function adminGetChapter(id: string): Promise<ChapterRow | null> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function adminCreateChapter(input: ChapterInsert): Promise<ChapterRow> {
  const { data, error } = await supabase.from('chapters').insert(input).select().single()
  if (error) throw error
  return data
}

export async function adminUpdateChapter(
  id: string,
  patch: ChapterUpdate,
): Promise<ChapterRow> {
  const { data, error } = await supabase
    .from('chapters')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function adminSwapChapterOrder(a: ChapterRow, b: ChapterRow): Promise<void> {
  const { error: e1 } = await supabase
    .from('chapters')
    .update({ order_index: b.order_index })
    .eq('id', a.id)
  if (e1) throw e1
  const { error: e2 } = await supabase
    .from('chapters')
    .update({ order_index: a.order_index })
    .eq('id', b.id)
  if (e2) throw e2
}

/** Write-only: nastaví/zmení správnu odpoveď kapitoly (nikdy sa nedá vyčítať späť). */
export async function adminSetChapterAnswer(
  chapterId: string,
  correctAnswers: string[],
): Promise<void> {
  const { error } = await supabase
    .from('chapter_answers')
    .upsert(
      { chapter_id: chapterId, correct_answers: correctAnswers },
      { onConflict: 'chapter_id' },
    )
  if (error) throw error
}

export async function adminSetConditionAnswer(
  conditionId: string,
  correctAnswers: string[],
): Promise<void> {
  const { error } = await supabase
    .from('chapter_answers')
    .upsert(
      { condition_id: conditionId, correct_answers: correctAnswers },
      { onConflict: 'condition_id' },
    )
  if (error) throw error
}

export async function adminSetQrToken(
  chapterId: string,
  conditionId: string | null,
  token: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_qr_token', {
    p_chapter_id: chapterId,
    p_condition_id: asRpcUuid(conditionId),
    p_token: token,
  })
  if (error) throw error
}

// --- Bloky obsahu -------------------------------------------------------

export async function adminListBlocks(chapterId: string): Promise<ChapterBlockRow[]> {
  const { data, error } = await supabase
    .from('chapter_blocks')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('order_index')
  if (error) throw error
  return data ?? []
}

export async function adminCreateBlock(
  input: ChapterBlockInsert,
): Promise<ChapterBlockRow> {
  const { data, error } = await supabase
    .from('chapter_blocks')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function adminUpdateBlock(
  id: string,
  patch: Partial<ChapterBlockInsert>,
): Promise<void> {
  const { error } = await supabase.from('chapter_blocks').update(patch).eq('id', id)
  if (error) throw error
}

export async function adminDeleteBlock(id: string): Promise<void> {
  const { error } = await supabase.from('chapter_blocks').delete().eq('id', id)
  if (error) throw error
}

export async function adminSwapBlockOrder(
  a: ChapterBlockRow,
  b: ChapterBlockRow,
): Promise<void> {
  await adminUpdateBlock(a.id, { order_index: b.order_index })
  await adminUpdateBlock(b.id, { order_index: a.order_index })
}

// --- Kombinované podmienky ----------------------------------------------

export async function adminListConditions(
  chapterId: string,
): Promise<UnlockConditionRow[]> {
  const { data, error } = await supabase
    .from('chapter_unlock_conditions')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('step_order')
  if (error) throw error
  return data ?? []
}

export async function adminCreateCondition(
  input: UnlockConditionInsert,
): Promise<UnlockConditionRow> {
  const { data, error } = await supabase
    .from('chapter_unlock_conditions')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function adminDeleteCondition(id: string): Promise<void> {
  const { error } = await supabase.from('chapter_unlock_conditions').delete().eq('id', id)
  if (error) throw error
}

// --- Hráčky a postup ------------------------------------------------------

export async function adminListPlayers(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'player')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function adminGetPlayerProgress(
  playerId: string,
): Promise<(PlayerProgressRow & { chapters: { title: string } | null })[]> {
  const { data, error } = await supabase
    .from('player_progress')
    .select('*, chapters(title)')
    .eq('player_id', playerId)
  if (error) throw error
  return (data ?? []) as (PlayerProgressRow & { chapters: { title: string } | null })[]
}

export async function adminSetChapterStatus(
  playerId: string,
  chapterId: string,
  status: 'locked' | 'unlocked' | 'completed',
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_chapter_status', {
    p_player_id: playerId,
    p_chapter_id: chapterId,
    p_status: status,
  })
  if (error) throw error
}

export async function adminResetProgress(playerId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reset_progress', { p_player_id: playerId })
  if (error) throw error
}
