import type { Database } from '../../types/database'

export type TimelineEntry =
  Database['public']['Functions']['get_my_timeline']['Returns'][number]
export type ChapterDetail = Database['public']['Views']['chapters_player_view']['Row']
export type ChapterBlock = Database['public']['Tables']['chapter_blocks']['Row']
export type UnlockCondition =
  Database['public']['Views']['chapter_unlock_conditions_player_view']['Row']

export interface QuestionConfig {
  type?: 'single' | 'multiple'
  prompt?: string
  options?: string[] | null
  maxAttempts?: number | null
  showHintOnWrongAnswer?: boolean
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
