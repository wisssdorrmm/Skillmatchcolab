import { cn } from '../../lib/cn'

interface ProgressBarProps {
  value: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
  label?: string
}

const HEIGHTS = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' }

export function ProgressBar({ value, size = 'sm', showLabel, className, label = 'Progress' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const done = pct >= 100
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn('relative flex-1 overflow-hidden rounded-full bg-surface-hover', HEIGHTS[size])}
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', done ? 'bg-success' : 'bg-accent')}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('w-10 shrink-0 text-right text-xs font-semibold tabular-nums', done ? 'text-success' : 'text-text-primary')}>
          {pct}%
        </span>
      )}
    </div>
  )
}
