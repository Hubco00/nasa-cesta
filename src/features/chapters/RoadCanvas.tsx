import type { ReactNode, Ref } from 'react'
import {
  CastleIcon,
  CompassIcon,
  DragonIcon,
  MountainIcon,
  TreesIcon,
  WavesIcon,
} from './icons'
import { CANVAS_WIDTH } from './roadLayout'

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

/**
 * Plátno mapy kapitol: rovnomerne škálované (pomer strán podľa výšky), s
 * jemnými dekoráciami, SVG vrstvou pre cestu a HTML vrstvou pre kapitoly.
 */
export function RoadCanvas({
  height,
  svg,
  children,
  canvasRef,
  className = '',
}: {
  height: number
  svg: ReactNode
  children: ReactNode
  canvasRef?: Ref<HTMLDivElement>
  className?: string
}) {
  return (
    <div
      ref={canvasRef}
      className={`relative mx-auto w-full max-w-[360px] ${className}`}
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${height}` }}
    >
      {DECORATIONS.map((d, i) => (
        <div
          key={i}
          className="pointer-events-none absolute text-[var(--color-accent)] opacity-[0.16]"
          style={{
            left: `${d.x}%`,
            top: `${((i + 0.5) / DECORATIONS.length) * 100}%`,
            width: d.size,
            height: d.size,
            transform: `translate(-50%, -50%) rotate(${d.rotate ?? 0}deg)`,
          }}
        >
          <d.Icon className="h-full w-full" />
        </div>
      ))}

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${CANVAS_WIDTH} ${height}`}
      >
        {svg}
      </svg>

      {children}
    </div>
  )
}
