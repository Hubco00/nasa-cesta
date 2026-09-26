import type { Database } from '../../types/database'

type TimelineRow = Database['public']['Functions']['get_my_timeline']['Returns'][number]

// get_my_timeline vracia pre zamknuté kapitoly NULL v title/slug/description/
// unlock_type (generované typy nullabilitu návratových stĺpcov funkcie nepoznajú).
export type TimelineEntry = Omit<
  TimelineRow,
  'title' | 'slug' | 'description' | 'unlock_type' | 'map_x' | 'map_y'
> & {
  title: string | null
  slug: string | null
  description: string | null
  unlock_type: string | null
  map_x: number | null
  map_y: number | null
}
export type ChapterDetail = Database['public']['Views']['chapters_player_view']['Row']
export type ChapterBlock = Database['public']['Tables']['chapter_blocks']['Row']
export type MapPin = Database['public']['Tables']['chapter_map_pins']['Row']
export type RoadSegment = Database['public']['Tables']['chapter_map_segments']['Row']
export type UnlockCondition =
  Database['public']['Views']['chapter_unlock_conditions_player_view']['Row']

export interface QuestionConfig {
  type?: 'single' | 'multiple'
  prompt?: string
  options?: string[] | null
  maxAttempts?: number | null
  showHintOnWrongAnswer?: boolean
}

/** chapter_blocks.question_config pre block_type = 'question'. */
export interface BlockQuestionConfig {
  /** 'place' — ťukne na miesto na mape, správne súradnice sú iba na serveri. */
  type?: 'text' | 'choice' | 'place'
  options?: string[]
  hint?: string
}

export interface VerifyAnswerResult {
  correct: boolean
  attemptsExhausted?: boolean
  attemptsLeft?: number | null
  showHint?: boolean
}

export interface VerifyQrResult {
  valid: boolean
}

export interface VerifyLocationResult {
  status: 'within_range' | 'too_far'
}
