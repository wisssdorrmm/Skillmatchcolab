import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

// Chart colors: one brand hue for single-series charts; text uses text tokens, never the series color.
const SERIES = '#d4f75c'
const GRID = '#26262c'
const SURFACE = '#17171a'
const MUTED = '#71717a'

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

/** Round the max up to a clean number and return 3–4 evenly spaced ticks. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / 3
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100)
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
}

const fmt = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)

export interface ChartPoint {
  key: string
  label: string
  value: number
  extra?: { label: string; value: string }[]
}

interface LineChartProps {
  points: ChartPoint[]
  height?: number
  ariaLabel: string
}

/** Single-series area/line with crosshair tooltip (mouse, touch and arrow keys). */
export function AreaLineChart({ points, height = 220, ariaLabel }: LineChartProps) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const pad = { l: 40, r: 44, t: 16, b: 28 }
  const w = Math.max(0, width - pad.l - pad.r)
  const h = height - pad.t - pad.b
  const ticks = niceTicks(Math.max(...points.map((p) => p.value), 0))
  const top = ticks[ticks.length - 1] || 1
  const x = (i: number) => pad.l + (points.length <= 1 ? w / 2 : (i / (points.length - 1)) * w)
  const y = (v: number) => pad.t + h - (v / top) * h

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = points.length ? `${line} L${x(points.length - 1).toFixed(1)},${pad.t + h} L${x(0).toFixed(1)},${pad.t + h} Z` : ''
  const last = points[points.length - 1]

  const nearest = (clientX: number, rect: DOMRect) => {
    const rel = clientX - rect.left - pad.l
    const i = Math.round((rel / Math.max(w, 1)) * (points.length - 1))
    return Math.max(0, Math.min(points.length - 1, i))
  }

  const onKey = (e: KeyboardEvent) => {
    if (!points.length) return
    if (e.key === 'ArrowRight') setActive((a) => Math.min(points.length - 1, (a ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? points.length) - 1))
    else if (e.key === 'Escape') setActive(null)
  }

  const labelIdx = points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i)
  const ap = active != null ? points[active] : null

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setActive(null)}
          className="touch-pan-y focus:outline-none"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED}>
                {fmt(t)}
              </text>
            </g>
          ))}
          {labelIdx.map((i) => (
            <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize={11} fill={MUTED}>
              {points[i]?.label}
            </text>
          ))}
          {area && <path d={area} fill={SERIES} fillOpacity={0.1} />}
          {line && <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {last && (
            <>
              <circle cx={x(points.length - 1)} cy={y(last.value)} r={6} fill={SURFACE} />
              <circle cx={x(points.length - 1)} cy={y(last.value)} r={4} fill={SERIES} />
              <text x={x(points.length - 1) + 10} y={y(last.value)} dy="0.32em" fontSize={12} fontWeight={600} fill="#f4f4f5">
                {fmt(last.value)}
              </text>
            </>
          )}
          {ap && active != null && (
            <>
              <line x1={x(active)} x2={x(active)} y1={pad.t} y2={pad.t + h} stroke="#52525b" strokeWidth={1} />
              <circle cx={x(active)} cy={y(ap.value)} r={6} fill={SURFACE} />
              <circle cx={x(active)} cy={y(ap.value)} r={4} fill={SERIES} />
            </>
          )}
        </svg>
      )}
      {ap && active != null && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-[120px] rounded-xl border border-border-strong bg-surface-2 px-3 py-2 text-xs shadow-xl"
          style={{ left: Math.min(Math.max(x(active) - 60, 0), Math.max(width - 140, 0)) }}
          role="status"
        >
          <p className="font-semibold text-text-primary">{ap.label}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-text-secondary">
            <span className="h-2 w-2 rounded-full" style={{ background: SERIES }} />
            <span className="tabular-nums text-text-primary">{fmt(ap.value)}</span>
          </p>
          {ap.extra?.map((e) => (
            <p key={e.label} className="text-text-secondary">
              {e.label}: <span className="tabular-nums text-text-primary">{e.value}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

interface ColumnChartProps {
  points: ChartPoint[]
  height?: number
  ariaLabel: string
  unit: string
}

/** Single-series columns: 4px rounded tops, 2px gaps, hover/focus tooltip per column. */
export function ColumnChart({ points, height = 120, ariaLabel, unit }: ColumnChartProps) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const pad = { l: 40, r: 44, t: 8, b: 22 }
  const w = Math.max(0, width - pad.l - pad.r)
  const h = height - pad.t - pad.b
  const ticks = niceTicks(Math.max(...points.map((p) => p.value), 0))
  const top = ticks[ticks.length - 1] || 1
  const band = points.length ? w / points.length : 0
  const barW = Math.max(2, Math.min(24, band - 2))
  const ap = active != null ? points[active] : null

  const colPath = (i: number, v: number) => {
    const bh = (v / top) * h
    const x0 = pad.l + i * band + (band - barW) / 2
    const y0 = pad.t + h
    if (bh <= 0) return ''
    const r = Math.min(4, barW / 2, bh)
    return `M${x0},${y0} L${x0},${y0 - bh + r} Q${x0},${y0 - bh} ${x0 + r},${y0 - bh} L${x0 + barW - r},${y0 - bh} Q${x0 + barW},${y0 - bh} ${x0 + barW},${y0 - bh + r} L${x0 + barW},${y0} Z`
  }

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onPointerLeave={() => setActive(null)}>
          <line x1={pad.l} x2={pad.l + w} y1={pad.t + h} y2={pad.t + h} stroke={GRID} strokeWidth={1} />
          <text x={pad.l - 8} y={pad.t} dy="0.7em" textAnchor="end" fontSize={11} fill={MUTED}>
            {fmt(top)}
          </text>
          {points.map((p, i) => (
            <g key={p.key}>
              <path d={colPath(i, p.value)} fill={SERIES} fillOpacity={active == null || active === i ? 1 : 0.55} />
              <rect
                x={pad.l + i * band}
                y={pad.t}
                width={band}
                height={h}
                fill="transparent"
                tabIndex={0}
                aria-label={`${p.label}: ${p.value} ${unit}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="focus:outline-none"
              />
            </g>
          ))}
          {points.length > 0 && (
            <>
              <text x={pad.l} y={height - 6} fontSize={11} fill={MUTED}>
                {points[0].label}
              </text>
              <text x={pad.l + w} y={height - 6} textAnchor="end" fontSize={11} fill={MUTED}>
                {points[points.length - 1].label}
              </text>
            </>
          )}
        </svg>
      )}
      {ap && active != null && (
        <div
          className="pointer-events-none absolute -top-2 z-10 whitespace-nowrap rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-xs shadow-xl"
          style={{ left: Math.min(Math.max(pad.l + active * band + band / 2 - 50, 0), Math.max(width - 120, 0)) }}
          role="status"
        >
          <span className="font-semibold text-text-primary">{ap.label}</span>
          <span className="text-text-secondary"> · </span>
          <span className="tabular-nums text-text-primary">
            {fmt(ap.value)} {unit}
          </span>
        </div>
      )}
    </div>
  )
}

/** Horizontal bars for "how many people said X" breakdowns. Values sit at the bar tip. */
export function BarList({ rows, total, max = 8 }: { rows: { label: string; count: number }[]; total: number; max?: number }) {
  const shown = rows.slice(0, max)
  const top = Math.max(...shown.map((r) => r.count), 1)
  if (!shown.length) return <p className="text-sm text-text-secondary">No answers yet.</p>
  return (
    <ul className="flex flex-col gap-2.5">
      {shown.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-text-primary">{r.label}</span>
            <span className="shrink-0 tabular-nums text-text-secondary">
              {fmt(r.count)}
              {total > 0 && <span className="text-text-muted"> · {Math.round((r.count / total) * 100)}%</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-hover">
            <div className="h-full rounded-full" style={{ width: `${(r.count / top) * 100}%`, background: SERIES }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
