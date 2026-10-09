import { cn } from '../../lib/cn'

interface TabsProps<T extends string> {
  tabs: { value: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
  className?: string
}

/** Segmented control — scrolls sideways on narrow screens. */
export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  return (
    <div className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1', className)} role="tablist">
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'flex h-9 shrink-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-colors',
              active ? 'bg-surface-hover text-text-primary' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={cn('rounded-full px-1.5 text-[11px]', active ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-text-secondary')}>
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
