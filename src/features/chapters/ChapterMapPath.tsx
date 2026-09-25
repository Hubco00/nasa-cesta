import { Link } from 'react-router-dom'
import type { RoadSegment, TimelineEntry } from './types'
import { CheckIcon, HeartIcon, LockIcon, unlockTypeIcon } from './icons'
import { RoadCanvas } from './RoadCanvas'
import {
  canvasHeight,
  HEX_ANCHOR_TRANSFORM,
  NODE_SIZE,
  resolvePosition,
  ROAD_STROKE,
  segmentPath,
  smoothPath,
  toPercent,
} from './roadLayout'

export function ChapterMapPath({
  entries,
  segments,
}: {
  entries: TimelineEntry[]
  segments: RoadSegment[]
}) {
  if (entries.length === 0) return null

  const points = entries.map((entry, i) => resolvePosition(entry, i))
  const height = canvasHeight(points)
  const pointById = new Map(entries.map((e, i) => [e.chapter_id, points[i]]))

  // Cestu kreslí admin v editore mapy; kým ju nenakreslí, ide hladko podľa poradia.
  const paths =
    segments.length > 0
      ? segments.flatMap((s) => {
          const a = pointById.get(s.from_chapter_id)
          const b = pointById.get(s.to_chapter_id)
          return a && b ? [{ id: s.id, d: segmentPath(a, b, s.curve) }] : []
        })
      : [{ id: 'auto', d: smoothPath(points) }]

  return (
    <RoadCanvas
      height={height}
      svg={paths.map((p) => (
        <path key={p.id} d={p.d} {...ROAD_STROKE} />
      ))}
    >
      {entries.map((entry, i) => (
        <div
          key={entry.chapter_id}
          className="absolute"
          style={{ ...toPercent(points[i], height), transform: HEX_ANCHOR_TRANSFORM }}
        >
          <div className="animate-fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
            <MapNode entry={entry} index={i} />
          </div>
        </div>
      ))}
    </RoadCanvas>
  )
}

function MapNode({ entry, index }: { entry: TimelineEntry; index: number }) {
  const locked = entry.status === 'locked'
  const completed = entry.status === 'completed'
  const isFinal = entry.is_final

  const node = (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`hex-frame ${locked ? 'hex-frame--locked' : isFinal ? 'hex-frame--final' : completed ? 'hex-frame--completed' : 'hex-frame--current'}`}
        style={{ width: NODE_SIZE, height: NODE_SIZE * 1.02 }}
      >
        <div className="hex-fill flex items-center justify-center">
          {locked ? (
            <div className="flex flex-col items-center gap-0.5 text-white/70">
              <LockIcon className="h-4 w-4" />
              <span className="text-xs font-semibold tabular-nums">{index + 1}</span>
            </div>
          ) : isFinal ? (
            <HeartIcon className="h-7 w-7 text-white drop-shadow" />
          ) : completed ? (
            <CheckIcon className="h-6 w-6 text-white" />
          ) : (
            <span className="text-[var(--color-rose-900)]">
              {unlockTypeIcon(entry.unlock_type ?? '', 'h-6 w-6')}
            </span>
          )}
        </div>
      </div>

      {!locked && (
        <span className="max-w-[6.5rem] text-center font-[family-name:var(--font-display)] text-xs leading-tight text-[var(--color-text)]">
          {entry.title}
        </span>
      )}
    </div>
  )

  if (locked) {
    return (
      <div aria-label={`Kapitola ${index + 1} — zamknuté`} className="cursor-not-allowed">
        {node}
      </div>
    )
  }

  return (
    <Link to={`/chapters/${entry.slug}`} aria-label={entry.title ?? undefined}>
      {node}
    </Link>
  )
}
