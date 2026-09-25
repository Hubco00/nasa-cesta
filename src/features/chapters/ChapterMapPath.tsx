import { Link } from 'react-router-dom'
import type { TimelineEntry } from './types'
import { CheckIcon, HeartIcon, LockIcon, unlockTypeIcon } from './icons'

const ROW_HEIGHT = 118
const X_PATTERN = [50, 26, 74, 32, 68] // % zľava, cyklicky sa opakuje — kľukatá cesta
const NODE_SIZE = 84

interface Point {
  x: number
  y: number
}

function nodeCenter(index: number): Point {
  return { x: X_PATTERN[index % X_PATTERN.length], y: index * ROW_HEIGHT + NODE_SIZE / 2 }
}

export function ChapterMapPath({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return null

  const totalHeight = (entries.length - 1) * ROW_HEIGHT + NODE_SIZE + 32
  const points = entries.map((_, i) => nodeCenter(i))
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="relative mx-auto w-full max-w-xs" style={{ height: totalHeight }}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${totalHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity="0.25"
          strokeWidth="2"
          strokeDasharray="1 6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {entries.map((entry, i) => {
        const { x, y } = points[i]
        return (
          <div
            key={entry.chapter_id}
            className="absolute animate-fade-in-up"
            style={{
              left: `${x}%`,
              top: y,
              transform: 'translate(-50%, -50%)',
              animationDelay: `${i * 70}ms`,
            }}
          >
            <MapNode entry={entry} index={i} />
          </div>
        )
      })}
    </div>
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
              {unlockTypeIcon(entry.unlock_type, 'h-6 w-6')}
            </span>
          )}
        </div>
      </div>

      {!locked && (
        <span className="max-w-[6.5rem] text-center text-xs leading-tight text-[var(--color-text)]">
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
    <Link to={`/chapters/${entry.slug}`} aria-label={entry.title}>
      {node}
    </Link>
  )
}
