import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-text-secondary',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
}

export function Badge({ tone = 'neutral', children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none', TONES[tone], className)}>
      {icon}
      {children}
    </span>
  )
}

interface ChipProps {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
  icon?: ReactNode
}

export function Chip({ active, onClick, children, className, icon }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
        active
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-lg border border-border px-2 py-1 text-xs text-text-secondary', className)}>
      {children}
    </span>
  )
}
