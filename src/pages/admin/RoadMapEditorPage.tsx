import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Layout } from '../../components/Layout'
import {
  adminCreateSegments,
  adminDeleteAllSegments,
  adminDeleteSegment,
  adminListChapters,
  adminListSegments,
  adminResetChapterPositions,
  adminSetChapterPositions,
  adminUpdateSegmentCurve,
  type ChapterRow,
  type RoadSegmentRow,
} from '../../features/admin/api'
import { RoadCanvas } from '../../features/chapters/RoadCanvas'
import {
  canvasHeight,
  CANVAS_WIDTH,
  clampToCanvas,
  HEX_ANCHOR_TRANSFORM,
  NODE_SIZE,
  resolvePosition,
  ROAD_STROKE,
  segmentPath,
  smoothPath,
  toPercent,
  type Point,
} from '../../features/chapters/roadLayout'

interface Drag {
  id: string
  pointerId: number
  startX: number
  startY: number
  from: Point
  moved: boolean
}

export function RoadMapEditorPage() {
  const [chapters, setChapters] = useState<ChapterRow[]>([])
  const [positions, setPositions] = useState<Record<string, Point>>({})
  const [segments, setSegments] = useState<RoadSegmentRow[]>([])
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const curveTimer = useRef<number | undefined>(undefined)

  async function reload() {
    const [rows, segs] = await Promise.all([adminListChapters(), adminListSegments()])
    setChapters(rows)
    setPositions(Object.fromEntries(rows.map((c, i) => [c.id, resolvePosition(c, i)])))
    setSegments(segs)
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await reload()
    })()
    return () => window.clearTimeout(curveTimer.current)
  }, [])

  async function run(action: () => Promise<void>) {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const numberOf = new Map(chapters.map((c, i) => [c.id, i + 1]))
  const points = chapters.map((c) => positions[c.id]).filter(Boolean)
  const height = canvasHeight(points)
  const selected = segments.find((s) => s.id === selectedId) ?? null

  // --- Posúvanie kapitol ---------------------------------------------------

  function onPointerDown(event: PointerEvent<HTMLDivElement>, id: string) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      from: positions[id],
      moved: false,
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!drag || drag.pointerId !== event.pointerId || !rect) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) < 5) return
    drag.moved = true
    const scale = CANVAS_WIDTH / rect.width
    const next = clampToCanvas({
      x: drag.from.x + dx * scale,
      y: drag.from.y + dy * scale,
    })
    setPositions((prev) => ({ ...prev, [drag.id]: next }))
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (drag.moved) {
      // Pri prvom posune sa uložia aj automatické polohy ostatných kapitol,
      // aby sa rozloženie neskôr samo nepreskupilo (napr. po pridaní kapitoly).
      const unsaved = chapters.filter((c) => c.map_x == null || c.map_y == null)
      const toSave = [drag.id, ...unsaved.map((c) => c.id).filter((id) => id !== drag.id)]
      void run(async () => {
        await adminSetChapterPositions(toSave.map((id) => ({ id, ...positions[id] })))
        setChapters((prev) =>
          prev.map((c) =>
            toSave.includes(c.id)
              ? { ...c, map_x: positions[c.id].x, map_y: positions[c.id].y }
              : c,
          ),
        )
      })
    } else {
      clickChapter(drag.id)
    }
  }

  // --- Kreslenie cesty -----------------------------------------------------

  function clickChapter(id: string) {
    setSelectedId(null)
    if (!connectFrom) return setConnectFrom(id)
    if (connectFrom === id) return setConnectFrom(null)

    const existing = segments.find(
      (s) =>
        (s.from_chapter_id === connectFrom && s.to_chapter_id === id) ||
        (s.from_chapter_id === id && s.to_chapter_id === connectFrom),
    )
    if (existing) {
      setSelectedId(existing.id)
      setConnectFrom(id)
      return
    }
    const from = connectFrom
    void run(async () => {
      const [created] = await adminCreateSegments([{ from, to: id }])
      setSegments((prev) => [...prev, created])
      setSelectedId(created.id)
      setConnectFrom(id) // pokračuj ďalej od tejto kapitoly
    })
  }

  function setCurve(value: number) {
    if (!selected) return
    const curve = value / 100
    const id = selected.id
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, curve } : s)))
    window.clearTimeout(curveTimer.current)
    curveTimer.current = window.setTimeout(
      () => void run(() => adminUpdateSegmentCurve(id, curve)),
      350,
    )
  }

  function removeSelected() {
    if (!selected) return
    const id = selected.id
    void run(async () => {
      await adminDeleteSegment(id)
      setSegments((prev) => prev.filter((s) => s.id !== id))
      setSelectedId(null)
    })
  }

  function buildInOrder() {
    if (
      segments.length > 0 &&
      !confirm('Nahradiť celú nakreslenú cestu cestou podľa poradia?')
    ) {
      return
    }
    void run(async () => {
      await adminDeleteAllSegments()
      const pairs = chapters.slice(1).map((c, i) => ({ from: chapters[i].id, to: c.id }))
      setSegments(await adminCreateSegments(pairs))
      setSelectedId(null)
      setConnectFrom(null)
    })
  }

  function clearRoad() {
    if (!confirm('Zmazať celú cestu? Kapitoly ostanú na svojich miestach.')) return
    void run(async () => {
      await adminDeleteAllSegments()
      setSegments([])
      setSelectedId(null)
      setConnectFrom(null)
    })
  }

  function resetLayout() {
    if (!confirm('Vrátiť kapitoly na automatické rozloženie? Cesta ostane.')) return
    void run(async () => {
      await adminResetChapterPositions()
      await reload()
    })
  }

  const label = (id: string) => {
    const c = chapters.find((ch) => ch.id === id)
    return `${numberOf.get(id)}. ${c?.title ?? ''}`
  }

  return (
    <Layout back={{ to: '/admin', label: 'Admin panel' }}>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-xl">
        Mapa kapitol
      </h1>
      <p className="mb-3 text-sm text-[var(--color-muted)]">
        Kapitoly posúvaj ťahaním. Cestu kreslíš ťuknutím na kapitolu a potom na ďalšiu —
        každé ďalšie ťuknutie pokračuje od poslednej. Ťuknutím na čiaru ju vyberieš a
        nastavíš jej oblúk.
      </p>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <button
          onClick={buildInOrder}
          className="rounded-lg border border-[var(--color-accent)] px-3 py-1.5 text-[var(--color-accent)]"
        >
          Cesta podľa poradia
        </button>
        <button
          onClick={clearRoad}
          disabled={segments.length === 0}
          className="rounded-lg border border-[var(--paper-border)] px-3 py-1.5 disabled:opacity-40"
        >
          Zmazať cestu
        </button>
        <button
          onClick={resetLayout}
          className="rounded-lg border border-[var(--paper-border)] px-3 py-1.5"
        >
          Pôvodné rozloženie
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-rose-600">Uloženie zlyhalo: {error}</p>}
      {loading && <p className="text-sm text-[var(--color-muted)]">Načítavam…</p>}

      {!loading && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget.firstElementChild) {
              setConnectFrom(null)
              setSelectedId(null)
            }
          }}
        >
          <RoadCanvas
            canvasRef={canvasRef}
            height={height}
            className="rounded-xl border border-dashed border-[var(--paper-border)]"
            svg={
              segments.length === 0 && points.length > 1 ? (
                // Kým admin cestu nenakreslí, hráčka vidí automatickú — ukáž ju slabo.
                <path d={smoothPath(points)} {...ROAD_STROKE} strokeOpacity={0.25} />
              ) : (
                segments.map((s) => {
                  const a = positions[s.from_chapter_id]
                  const b = positions[s.to_chapter_id]
                  if (!a || !b) return null
                  const d = segmentPath(a, b, s.curve)
                  const isSelected = s.id === selectedId
                  return (
                    <g key={s.id}>
                      <path
                        d={d}
                        {...ROAD_STROKE}
                        strokeOpacity={isSelected ? 1 : ROAD_STROKE.strokeOpacity}
                        strokeWidth={isSelected ? 3.5 : ROAD_STROKE.strokeWidth}
                      />
                      <path
                        d={d}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={22}
                        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedId(s.id)
                          setConnectFrom(null)
                        }}
                      >
                        <title>{`Úsek ${label(s.from_chapter_id)} → ${label(s.to_chapter_id)}`}</title>
                      </path>
                    </g>
                  )
                })
              )
            }
          >
            {chapters.map((chapter) => {
              const point = positions[chapter.id]
              if (!point) return null
              const isStart = connectFrom === chapter.id
              const isEnd =
                selected &&
                (selected.from_chapter_id === chapter.id ||
                  selected.to_chapter_id === chapter.id)
              return (
                <div
                  key={chapter.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Kapitola ${label(chapter.id)}`}
                  aria-pressed={isStart}
                  onPointerDown={(e) => onPointerDown(e, chapter.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      clickChapter(chapter.id)
                    }
                  }}
                  className={`absolute flex cursor-grab touch-none select-none flex-col items-center gap-1 active:cursor-grabbing ${
                    chapter.is_published ? '' : 'opacity-50'
                  }`}
                  style={{ ...toPercent(point, height), transform: HEX_ANCHOR_TRANSFORM }}
                >
                  <div
                    className={`hex-frame ${isStart || isEnd ? 'hex-frame--current' : 'hex-frame--completed'}`}
                    style={{ width: NODE_SIZE, height: NODE_SIZE * 1.02 }}
                  >
                    <div className="hex-fill flex items-center justify-center">
                      <span
                        className={`font-[family-name:var(--font-display)] text-xl font-semibold ${
                          isStart || isEnd ? 'text-[var(--color-rose-900)]' : 'text-white'
                        }`}
                      >
                        {numberOf.get(chapter.id)}
                      </span>
                    </div>
                  </div>
                  <span className="max-w-[6.5rem] text-center font-[family-name:var(--font-display)] text-xs leading-tight">
                    {chapter.title}
                    {!chapter.is_published && ' (skryté)'}
                  </span>
                </div>
              )
            })}
          </RoadCanvas>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 mt-4 border-t border-[var(--paper-border)] bg-[var(--color-bg)]/95 px-4 py-3 backdrop-blur">
        {selected ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              Úsek: {label(selected.from_chapter_id)} → {label(selected.to_chapter_id)}
            </p>
            <label className="flex items-center gap-3 text-sm">
              <span className="shrink-0">Oblúk</span>
              <input
                type="range"
                min={-100}
                max={100}
                step={5}
                value={Math.round(selected.curve * 100)}
                onChange={(e) => setCurve(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </label>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setCurve(0)} className="text-[var(--color-accent)]">
                Rovno
              </button>
              <button onClick={removeSelected} className="text-rose-600">
                Zmazať úsek
              </button>
              <button
                onClick={() => setSelectedId(null)}
                className="ml-auto text-[var(--color-muted)]"
              >
                Hotovo
              </button>
            </div>
          </div>
        ) : connectFrom ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <p>
              Cesta vedie z <strong>{label(connectFrom)}</strong> — ťukni na ďalšiu
              kapitolu.
            </p>
            <button
              onClick={() => setConnectFrom(null)}
              className="shrink-0 text-[var(--color-muted)]"
            >
              Ukončiť
            </button>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            {segments.length === 0
              ? 'Zatiaľ je tu automatická cesta (slabá čiara). Ťukni na kapitolu, odkiaľ má tvoja cesta začínať.'
              : 'Ťukni na kapitolu, odkiaľ má cesta pokračovať, alebo na čiaru, ktorú chceš upraviť.'}
          </p>
        )}
      </div>
    </Layout>
  )
}
