import { lazy, Suspense } from 'react'
import { LocationCheck } from '../geolocation/LocationCheck'
import { QuestionForm } from '../questions/QuestionForm'
import { CombinedConditions } from './CombinedConditions'
import { ManualStep } from './ManualStep'
import type { ChapterDetail, QuestionConfig } from './types'

// html5-qrcode je ťažká závislosť — načíta sa až keď ju hráčka naozaj
// potrebuje (kapitola typu qr_code / combined s QR podmienkou).
const QrChapterUnlock = lazy(() =>
  import('../qr-scanner/QrChapterUnlock').then((m) => ({ default: m.QrChapterUnlock })),
)

export function ChapterActionPanel({
  chapter,
  onCompleted,
}: {
  chapter: ChapterDetail
  onCompleted: () => void
}) {
  const chapterId = chapter.id
  if (!chapterId) return null

  switch (chapter.unlock_type) {
    case 'manual':
      return (
        <ManualStep
          chapterId={chapterId}
          successMessage={chapter.success_message}
          onCompleted={onCompleted}
        />
      )
    case 'question':
      return (
        <QuestionForm
          chapterId={chapterId}
          conditionId={null}
          config={(chapter.question_config as QuestionConfig) ?? {}}
          hint={chapter.hint}
          successMessage={chapter.success_message}
          failureMessage={chapter.failure_message}
          onCompleted={onCompleted}
        />
      )
    case 'qr_code':
      return (
        <Suspense
          fallback={
            <p className="text-sm text-[var(--color-muted)]">Načítavam skener…</p>
          }
        >
          <QrChapterUnlock
            chapterId={chapterId}
            conditionId={null}
            successMessage={chapter.success_message}
            failureMessage={chapter.failure_message}
            onCompleted={onCompleted}
          />
        </Suspense>
      )
    case 'location':
      return (
        <LocationCheck
          chapterId={chapterId}
          conditionId={null}
          successMessage={chapter.success_message}
          failureMessage={chapter.failure_message}
          onCompleted={onCompleted}
        />
      )
    case 'combined':
      return <CombinedConditions chapterId={chapterId} onCompleted={onCompleted} />
    case 'admin':
      return (
        <p className="rounded-2xl bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted)] shadow-sm">
          Táto kapitola čaká na ručné odomknutie. Ozvi sa, ak si pripravená pokračovať.
        </p>
      )
    default:
      return null
  }
}
