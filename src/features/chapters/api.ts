import { supabase } from '../../lib/supabase'
import type {
  ChapterBlock,
  ChapterDetail,
  MapPin,
  RoadSegment,
  TimelineEntry,
  UnlockCondition,
  VerifyAnswerResult,
  VerifyLocationResult,
  VerifyQrResult,
} from './types'

export async function fetchTimeline(): Promise<TimelineEntry[]> {
  const { data, error } = await supabase.rpc('get_my_timeline')
  if (error) throw error
  return data ?? []
}

export async function fetchRoadSegments(): Promise<RoadSegment[]> {
  const { data, error } = await supabase.from('chapter_map_segments').select('*')
  if (error) throw error
  return data ?? []
}

export async function fetchChapterBySlug(slug: string): Promise<ChapterDetail | null> {
  const { data, error } = await supabase
    .from('chapters_player_view')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchProgressStatus(chapterId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_chapter_status', {
    p_chapter_id: chapterId,
  })
  if (error) throw error
  return data ?? 'locked'
}

/** Hlavný list kapitoly — bloky, ktoré nepatria žiadnemu miestu na mape. */
export async function fetchChapterBlocks(chapterId: string): Promise<ChapterBlock[]> {
  const { data, error } = await supabase
    .from('chapter_blocks')
    .select('*')
    .eq('chapter_id', chapterId)
    .is('map_pin_id', null)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchChapterMapPins(chapterId: string): Promise<MapPin[]> {
  const { data, error } = await supabase
    .from('chapter_map_pins')
    .select('*')
    .eq('chapter_id', chapterId)
  if (error) throw error
  return data ?? []
}

export async function fetchPinBlocks(pinId: string): Promise<ChapterBlock[]> {
  const { data, error } = await supabase
    .from('chapter_blocks')
    .select('*')
    .eq('map_pin_id', pinId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchConditionProgress(
  conditionIds: string[],
): Promise<Record<string, string>> {
  if (conditionIds.length === 0) return {}
  const { data, error } = await supabase
    .from('player_condition_progress')
    .select('condition_id, status')
    .in('condition_id', conditionIds)
  if (error) throw error

  const result: Record<string, string> = {}
  for (const row of data ?? []) result[row.condition_id] = row.status
  return result
}

export async function fetchUnlockConditions(
  chapterId: string,
): Promise<UnlockCondition[]> {
  const { data, error } = await supabase
    .from('chapter_unlock_conditions_player_view')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('step_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function verifyAnswer(
  chapterId: string,
  conditionId: string | null,
  answer: string,
): Promise<VerifyAnswerResult> {
  const { data, error } = await supabase.rpc('verify_answer', {
    p_chapter_id: chapterId,
    p_condition_id: asRpcUuid(conditionId),
    p_answer: answer,
  })
  if (error) throw error
  return data as unknown as VerifyAnswerResult
}

export async function verifyQr(
  chapterId: string,
  conditionId: string | null,
  token: string,
): Promise<VerifyQrResult> {
  const { data, error } = await supabase.rpc('verify_qr', {
    p_chapter_id: chapterId,
    p_condition_id: asRpcUuid(conditionId),
    p_token: token,
  })
  if (error) throw error
  return data as unknown as VerifyQrResult
}

export async function verifyLocation(
  chapterId: string,
  conditionId: string | null,
  lat: number,
  lng: number,
  accuracy: number,
): Promise<VerifyLocationResult> {
  const { data, error } = await supabase.rpc('verify_location', {
    p_chapter_id: chapterId,
    p_condition_id: asRpcUuid(conditionId),
    p_lat: lat,
    p_lng: lng,
    p_accuracy: accuracy,
  })
  if (error) throw error
  return data as unknown as VerifyLocationResult
}

/** Otázka v obsahu (nie podmienka odomknutia) — správnosť overí server. */
export async function verifyBlockAnswer(
  blockId: string,
  answer: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_block_answer', {
    p_block_id: blockId,
    p_answer: answer,
  })
  if (error) throw error
  return Boolean((data as { correct?: boolean } | null)?.correct)
}

export type QuestionResult = 'correct' | 'wrong'

/**
 * List pod otázkou pre daný výsledok. Server ho vráti iba ak ho hráčka už
 * "odomkla" odpoveďou (inak null) — pozri block_is_visible().
 */
export async function fetchQuestionOutcome(
  questionId: string,
  result: QuestionResult,
): Promise<ChapterBlock | null> {
  const { data, error } = await supabase
    .from('chapter_blocks')
    .select('*')
    .eq('parent_block_id', questionId)
    .eq('reveal_on', result)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchBlockSolved(blockId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('player_block_progress')
    .select('solved_at')
    .eq('block_id', blockId)
    .maybeSingle()
  if (error) throw error
  return Boolean(data?.solved_at)
}

export async function completeManualStep(chapterId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_manual_step', {
    p_chapter_id: chapterId,
  })
  if (error) throw error
}

// Generované RPC typy neoznačujú uuid parametre ako nullable (Postgres typ
// parametra sám osebe nenesie informáciu o nullabilite) — jednoduché
// (nie kombinované) kapitoly posielajú p_condition_id = NULL.
function asRpcUuid(id: string | null): string {
  return id as unknown as string
}
