import { removeChapterPhotos } from '../../lib/storage'
import { findCity } from '../map/cities'
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
export type MapPinRow = Database['public']['Tables']['chapter_map_pins']['Row']
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

export async function adminGetChapterAnswer(chapterId: string): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('chapter_answers')
    .select('correct_answers')
    .eq('chapter_id', chapterId)
    .maybeSingle()
  if (error) throw error
  return data?.correct_answers ?? null
}

export interface BlockAnswer {
  correctAnswers: string[]
  /** Otázka s odpoveďou miestom na mape. */
  place: { lat: number; lng: number; radiusMeters: number } | null
}

export async function adminGetBlockAnswer(blockId: string): Promise<BlockAnswer | null> {
  const { data, error } = await supabase
    .from('chapter_answers')
    .select('correct_answers, latitude, longitude, radius_meters')
    .eq('block_id', blockId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    correctAnswers: data.correct_answers,
    place:
      data.latitude !== null && data.longitude !== null && data.radius_meters !== null
        ? { lat: data.latitude, lng: data.longitude, radiusMeters: data.radius_meters }
        : null,
  }
}

export async function adminSetBlockAnswer(
  blockId: string,
  correctAnswers: string[],
): Promise<void> {
  const { error } = await supabase.from('chapter_answers').upsert(
    {
      block_id: blockId,
      correct_answers: correctAnswers,
      latitude: null,
      longitude: null,
      radius_meters: null,
    },
    { onConflict: 'block_id' },
  )
  if (error) throw error
}

/** Správne miesto na mape + tolerancia v metroch. */
export async function adminSetBlockPlaceAnswer(
  blockId: string,
  place: { lat: number; lng: number; radiusMeters: number },
): Promise<void> {
  const { error } = await supabase.from('chapter_answers').upsert(
    {
      block_id: blockId,
      correct_answers: [],
      latitude: place.lat,
      longitude: place.lng,
      radius_meters: place.radiusMeters,
    },
    { onConflict: 'block_id' },
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

/**
 * Bloky jedného "priestoru" kapitoly: bez `mapPinId` hlavný list kapitoly,
 * s `mapPinId` obsah konkrétneho miesta na mape.
 */
/** Uloží (iba hash) nový token QR bloku — starý QR kód tým prestane platiť. */
export async function adminSetBlockQrToken(
  blockId: string,
  token: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_block_qr_token', {
    p_block_id: blockId,
    p_token: token,
  })
  if (error) throw error
}

/** Ktoré z daných QR blokov už majú nastavený QR kód. */
export async function adminListBlockQrTokens(blockIds: string[]): Promise<Set<string>> {
  if (blockIds.length === 0) return new Set()
  const { data, error } = await supabase
    .from('chapter_block_qr_tokens')
    .select('block_id')
    .in('block_id', blockIds)
  if (error) throw error
  return new Set((data ?? []).map((row) => row.block_id))
}

export async function adminListBlocks(
  chapterId: string,
  mapPinId: string | null = null,
): Promise<ChapterBlockRow[]> {
  let query = supabase.from('chapter_blocks').select('*').eq('chapter_id', chapterId)
  query = mapPinId ? query.eq('map_pin_id', mapPinId) : query.is('map_pin_id', null)
  const { data, error } = await query.order('order_index')
  if (error) throw error
  return data ?? []
}

// --- Miesta na mape -------------------------------------------------------

export async function adminListMapPins(chapterId: string): Promise<MapPinRow[]> {
  const { data, error } = await supabase
    .from('chapter_map_pins')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function adminCreateMapPin(
  chapterId: string,
  cityKey: string,
): Promise<MapPinRow> {
  const { data, error } = await supabase
    .from('chapter_map_pins')
    .insert({ chapter_id: chapterId, city_key: cityKey })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Zmaže miesto aj všetky jeho bloky (ON DELETE CASCADE). */
export async function adminDeleteMapPin(id: string): Promise<void> {
  const { error } = await supabase.from('chapter_map_pins').delete().eq('id', id)
  if (error) throw error
}

export interface ChapterContentSummary {
  storyBlocks: number
  pinCities: string[]
}

/** Prehľad obsahu všetkých kapitol pre zoznam v admine (2 dotazy spolu). */
export async function adminContentSummary(): Promise<
  Record<string, ChapterContentSummary>
> {
  const [blocks, pins] = await Promise.all([
    supabase.from('chapter_blocks').select('chapter_id, map_pin_id, parent_block_id'),
    supabase.from('chapter_map_pins').select('chapter_id, city_key'),
  ])
  if (blocks.error) throw blocks.error
  if (pins.error) throw pins.error

  const summary: Record<string, ChapterContentSummary> = {}
  const entry = (id: string) => (summary[id] ??= { storyBlocks: 0, pinCities: [] })
  // Počíta iba položky listu (príbeh/fotka/otázka), nie ich fotky či listy po odpovedi.
  for (const b of blocks.data ?? []) {
    if (!b.map_pin_id && !b.parent_block_id) entry(b.chapter_id).storyBlocks++
  }
  for (const p of pins.data ?? []) entry(p.chapter_id).pinCities.push(p.city_key)
  return summary
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

// --- Mapa kapitol (cesta) -------------------------------------------------

export type RoadSegmentRow = Database['public']['Tables']['chapter_map_segments']['Row']

export async function adminListSegments(): Promise<RoadSegmentRow[]> {
  const { data, error } = await supabase
    .from('chapter_map_segments')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function adminCreateSegments(
  pairs: { from: string; to: string }[],
): Promise<RoadSegmentRow[]> {
  if (pairs.length === 0) return []
  const { data, error } = await supabase
    .from('chapter_map_segments')
    .insert(pairs.map((p) => ({ from_chapter_id: p.from, to_chapter_id: p.to })))
    .select()
  if (error) throw error
  return data ?? []
}

export async function adminUpdateSegmentCurve(id: string, curve: number): Promise<void> {
  const { error } = await supabase
    .from('chapter_map_segments')
    .update({ curve })
    .eq('id', id)
  if (error) throw error
}

export async function adminDeleteSegment(id: string): Promise<void> {
  const { error } = await supabase.from('chapter_map_segments').delete().eq('id', id)
  if (error) throw error
}

export async function adminDeleteAllSegments(): Promise<void> {
  const { error } = await supabase
    .from('chapter_map_segments')
    .delete()
    .not('id', 'is', null)
  if (error) throw error
}

export async function adminSetChapterPositions(
  positions: { id: string; x: number; y: number }[],
): Promise<void> {
  for (const p of positions) {
    const { error } = await supabase
      .from('chapters')
      .update({ map_x: Math.round(p.x), map_y: Math.round(p.y) })
      .eq('id', p.id)
    if (error) throw error
  }
}

export async function adminResetChapterPositions(): Promise<void> {
  const { error } = await supabase
    .from('chapters')
    .update({ map_x: null, map_y: null })
    .not('id', 'is', null)
  if (error) throw error
}

// --- Podmienky odomknutia a mazanie kapitol -------------------------------

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

export interface QuestionOption {
  id: string
  chapterId: string
  label: string
}

/** Všetky otázky v obsahu (aj pri mestách) — na výber podmienky odomknutia. */
export async function adminListQuestions(): Promise<QuestionOption[]> {
  const { data, error } = await supabase
    .from('chapter_blocks')
    .select(
      // chapters!… — chapter_blocks a chapters sú teraz prepojené dvakrát (chapter_id
      // aj chapters.required_block_id), embed musí povedať, ktorým vzťahom ísť.
      'id, chapter_id, body_markdown, chapters!chapter_blocks_chapter_id_fkey(title, order_index), chapter_map_pins(city_key)',
    )
    .eq('block_type', 'question')
  if (error) throw error
  return (data ?? [])
    .map((q) => {
      const chapter = q.chapters as { title: string; order_index: number } | null
      const city = (q.chapter_map_pins as { city_key: string } | null)?.city_key
      return {
        id: q.id,
        chapterId: q.chapter_id,
        order: chapter?.order_index ?? 0,
        label: `${chapter?.title ?? '?'}${city ? ` · ${findCity(city)?.label ?? city}` : ''} — ${shorten(q.body_markdown ?? '', 40)}`,
      }
    })
    .sort((a, b) => a.order - b.order)
    .map(({ order: _order, ...rest }) => rest)
}

/** Zmaže kapitolu s celým obsahom; nadväzujúce kapitoly napojí na jej predchodcu. */
export async function adminDeleteChapter(chapterId: string): Promise<void> {
  const { data, error } = await supabase.rpc('admin_delete_chapter', {
    p_chapter_id: chapterId,
  })
  if (error) throw error
  await removeChapterPhotos((data as string[] | null) ?? [])
}
