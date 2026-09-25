import { Link } from 'react-router-dom'
import type { TimelineEntry } from './types'
import {
  CastleIcon,
  CheckIcon,
  CompassIcon,
  DragonIcon,
  HeartIcon,
  LockIcon,
  MountainIcon,
  TreesIcon,
  WavesIcon,
  unlockTypeIcon,
} from './icons'

const ROW_HEIGHT = 132
const NODE_SIZE = 84

interface Point {
  x: number
  y: number
}

// Jemné organické vlnenie namiesto strojového cik-cak — pripomína skutočnú
// cestu na mape, nie striktné striedanie ľavá/pravá strana.
function nodeCenter(index: number): Point {
  const x = 50 + 26 * Math.sin(index * 1.05 + 0.4) + 6 * Math.sin(index * 2.3)
  return { x: Math.max(18, Math.min(82, x)), y: index * ROW_HEIGHT + NODE_SIZE / 2 }
}

// Catmull-Rom → kubické Bézierove krivky: hladká cesta prechádzajúca presne
// cez stred každého uzla, v štýle kľukatej cesty na fantasy mape.
function smoothPath(points: Point[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

const DECORATIONS: {
  Icon: typeof CastleIcon
  x: number
  size: number
  rotate?: number
}[] = [
  { Icon: MountainIcon, x: 6, size: 46, rotate: -4 },
  { Icon: TreesIcon, x: 90, size: 38, rotate: 3 },
  { Icon: CastleIcon, x: 92, size: 44 },
  { Icon: DragonIcon, x: 8, size: 40, rotate: 6 },
  { Icon: WavesIcon, x: 88, size: 42 },
  { Icon: CompassIcon, x: 10, size: 34, rotate: -8 },
  { Icon: TreesIcon, x: 6, size: 36 },
  { Icon: CastleIcon, x: 90, size: 40, rotate: -3 },
]

export function ChapterMapPath({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return null

  const totalHeight = (entries.length - 1) * ROW_HEIGHT + NODE_SIZE + 40
  const points = entries.map((_, i) => nodeCenter(i))
  const pathD = smoothPath(points)

  return (
    <div className="relative mx-auto w-full max-w-xs" style={{ height: totalHeight }}>
      {/* Ambientné dekorácie — obyčajné HTML prvky, nie súčasť skresleného SVG
          priestoru cesty (ten má preserveAspectRatio="none" kvôli percentuálnej
          šírke/pixelovej výške), inak by sa ikony vizuálne roztiahli. */}
      {DECORATIONS.map((d, i) => {
        const y = ((i + 0.5) / DECORATIONS.length) * totalHeight
        return (
          <div
            key={i}
            className="pointer-events-none absolute text-[var(--color-accent)] opacity-[0.16]"
            style={{
              left: `${d.x}%`,
              top: y,
              width: d.size,
              height: d.size,
              transform: `translate(-50%, -50%) rotate(${d.rotate ?? 0}deg)`,
            }}
          >
            <d.Icon className="h-full w-full" />
          </div>
        )
      })}

      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 100 ${totalHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={pathD}
          fill="none"
          stroke="var(--map-road)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={pathD}
          fill="none"
          stroke="var(--map-road-line)"
          strokeWidth="1.5"
          strokeDasharray="1 7"
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
    <Link to={`/chapters/${entry.slug}`} aria-label={entry.title}>
      {node}
    </Link>
  )
}
