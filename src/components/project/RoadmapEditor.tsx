import { ArrowDown, ArrowUp, CheckCircle2, Plus, Shuffle, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { inputClass } from '../ui/Field'
import { newKey, roadmapTotal, type RoadmapDraft } from '../../lib/roadmap'

const STARTER: [string, number][] = [
  ['Plan the idea and design the screens', 15],
  ['Build the MVP', 40],
  ['Test with 10 real users', 20],
  ['Launch publicly', 15],
  ['Reach the first 100 users', 10],
]

export function RoadmapEditor({ steps, onChange }: { steps: RoadmapDraft[]; onChange: (next: RoadmapDraft[]) => void }) {
  const total = roadmapTotal(steps)
  const remaining = 100 - total

  const update = (key: string, patch: Partial<RoadmapDraft>) => onChange(steps.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const remove = (key: string) => onChange(steps.filter((s) => s.key !== key))
  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= steps.length) return
    const next = [...steps]
    ;[next[index], next[j]] = [next[j], next[index]]
    onChange(next)
  }
  const add = () => onChange([...steps, { key: newKey(), title: '', weight: remaining > 0 ? Math.min(remaining, 100) : 10 }])
  const splitEvenly = () => {
    if (!steps.length) return
    const base = Math.floor(100 / steps.length)
    let extra = 100 - base * steps.length
    onChange(steps.map((s) => ({ ...s, weight: base + (extra-- > 0 ? 1 : 0) })))
  }
  const useStarter = () => onChange(STARTER.map(([title, weight]) => ({ key: newKey(), title, weight })))

  return (
    <div>
      {steps.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong px-5 py-8 text-center">
          <p className="font-semibold text-text-primary">Break your project into steps</p>
          <p className="mt-1 max-w-sm text-sm text-text-secondary">
            Give each step a % of the work. Ticking a step off moves your progress bar by that amount.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={useStarter} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover">
              <Sparkles size={16} /> Use a starter roadmap
            </button>
            <button type="button" onClick={add} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-text-primary hover:bg-surface-2">
              <Plus size={16} /> Add my own step
            </button>
          </div>
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2 rounded-2xl border border-border bg-surface-2/40 p-2 pl-3">
              <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-text-muted">
                {s.isDone ? <CheckCircle2 size={16} className="text-success" aria-label="Done" /> : i + 1}
              </span>
              <input
                value={s.title}
                maxLength={140}
                onChange={(e) => update(s.key, { title: e.target.value })}
                placeholder={`Step ${i + 1}, e.g. "Build the login screen"`}
                aria-label={`Step ${i + 1} name`}
                className={cn(inputClass, 'h-11 min-w-0 flex-1 bg-surface px-3 text-sm')}
              />
              <div className="relative w-[76px] shrink-0">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={s.weight}
                  onChange={(e) => {
                    const v = e.target.value
                    update(s.key, { weight: v === '' ? '' : Math.max(0, Math.min(100, Math.round(Number(v)))) })
                  }}
                  aria-label={`Step ${i + 1} percent`}
                  className={cn(inputClass, 'h-11 bg-surface pl-3 pr-7 text-right text-sm tabular-nums')}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">%</span>
              </div>
              <div className="hidden shrink-0 flex-col sm:flex">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="flex h-5 w-7 items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30">
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === steps.length - 1}
                  aria-label="Move down"
                  className="flex h-5 w-7 items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(s.key)}
                aria-label={`Remove step ${i + 1}`}
                className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ol>
      )}

      {steps.length > 0 && (
        <>
          <div className="mt-4 rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-text-primary">Total</span>
              <span className={cn('font-bold tabular-nums', total === 100 ? 'text-success' : total > 100 ? 'text-danger' : 'text-warning')}>{total}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-hover">
              <div
                className={cn('h-full rounded-full transition-all', total === 100 ? 'bg-success' : total > 100 ? 'bg-danger' : 'bg-warning')}
                style={{ width: `${Math.min(total, 100)}%` }}
              />
            </div>
            <p className={cn('mt-2 text-[13px]', total === 100 ? 'text-success' : total > 100 ? 'text-danger' : 'text-text-secondary')}>
              {total === 100
                ? 'Perfect — your roadmap adds up to 100%.'
                : total > 100
                  ? `That's ${total - 100}% too much. Lower some steps.`
                  : `Add ${remaining}% more to reach 100%.`}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={add}
              disabled={steps.length >= 30}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-text-primary hover:bg-surface-2 disabled:opacity-50"
            >
              <Plus size={16} /> Add step
            </button>
            <button type="button" onClick={splitEvenly} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-text-secondary hover:bg-surface-2 hover:text-text-primary">
              <Shuffle size={15} /> Split evenly
            </button>
          </div>
        </>
      )}
    </div>
  )
}
