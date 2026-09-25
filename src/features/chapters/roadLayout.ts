// Rozloženie mapy kapitol — spoločné pre hráčsku mapu aj admin editor, aby
// admin videl presne to, čo potom uvidí hráčka.
//
// Súradnice sú logické: plátno je široké CANVAS_WIDTH jednotiek a na obrazovke
// sa rovnomerne škáluje (bez skreslenia), výška rastie s počtom kapitol.

export const CANVAS_WIDTH = 360
export const NODE_SIZE = 84
const ROW_HEIGHT = 132
const TOP_PADDING = 30
/** Miesto pod najnižšou kapitolou (na jej názov). */
const BOTTOM_PADDING = 70

/** Vzhľad cesty — iba jednoduchá prerušovaná čiara. */
export const ROAD_STROKE = {
  fill: 'none',
  stroke: 'var(--color-accent)',
  strokeOpacity: 0.55,
  strokeWidth: 2.5,
  strokeDasharray: '7 8',
  strokeLinecap: 'round' as const,
}

export interface Point {
  x: number
  y: number
}

/** Automatická poloha podľa poradia — jemne kľukatá cesta zhora nadol. */
export function autoPosition(index: number): Point {
  const percent = 50 + 26 * Math.sin(index * 1.05 + 0.4) + 6 * Math.sin(index * 2.3)
  const clamped = Math.max(18, Math.min(82, percent))
  return {
    x: (clamped / 100) * CANVAS_WIDTH,
    y: TOP_PADDING + NODE_SIZE / 2 + index * ROW_HEIGHT,
  }
}

export function resolvePosition(
  stored: { map_x: number | null; map_y: number | null },
  index: number,
): Point {
  return stored.map_x != null && stored.map_y != null
    ? { x: stored.map_x, y: stored.map_y }
    : autoPosition(index)
}

export function canvasHeight(points: Point[]): number {
  const lowest = points.reduce((max, p) => Math.max(max, p.y), 0)
  return Math.max(lowest + NODE_SIZE / 2 + BOTTOM_PADDING, 240)
}

export function clampToCanvas(p: Point): Point {
  const half = NODE_SIZE / 2
  return {
    x: Math.max(half, Math.min(CANVAS_WIDTH - half, p.x)),
    y: Math.max(half, p.y),
  }
}

/**
 * Úsek cesty medzi dvoma kapitolami. `curve` -1..1: 0 = rovno, inak oblúk na
 * jednu (+) alebo druhú (−) stranu, najviac o 40 % dĺžky úseku.
 */
export function segmentPath(a: Point, b: Point, curve: number): string {
  if (!curve) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy) || 1
  const offset = curve * length * 0.8 // bod ovládania = 2× max. vychýlenie
  const cx = (a.x + b.x) / 2 + (-dy / length) * offset
  const cy = (a.y + b.y) / 2 + (dx / length) * offset
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`
}

/** Hladká cesta cez všetky body v poradí (keď admin ešte nenakreslil úseky). */
export function smoothPath(points: Point[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${
      p2.x - (p3.x - p1.x) / 6
    } ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`
  }
  return d
}

/**
 * Posun uzla tak, aby na bode cesty ležal stred šesťuholníka (názov kapitoly
 * visí pod ním). Musí byť na inom prvku než animácia nábehu — animovaný
 * `transform` by inak tento posun prepísal.
 */
export const HEX_ANCHOR_TRANSFORM = `translate(-50%, -${(NODE_SIZE * 1.02) / 2}px)`

/** Poloha v % plátna — pre absolútne umiestnené HTML prvky nad SVG. */
export function toPercent(p: Point, height: number) {
  return { left: `${(p.x / CANVAS_WIDTH) * 100}%`, top: `${(p.y / height) * 100}%` }
}
