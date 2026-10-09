import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-border bg-surface', className)} {...rest} />
}

interface SectionProps {
  title: ReactNode
  subtitle?: ReactNode
  action?: { label: string; to: string }
  right?: ReactNode
  children: ReactNode
  className?: string
}

/** A titled block on a page, with an optional "See all" link. */
export function Section({ title, subtitle, action, right, children, className }: SectionProps) {
  return (
    <section className={cn('mt-8', className)}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-text-primary">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        {right}
        {action && (
          <Link to={action.to} className="shrink-0 text-sm font-medium text-accent hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  accent?: boolean
  icon?: ReactNode
  to?: string
}

export function StatCard({ label, value, hint, accent, icon, to }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 text-[13px] text-text-secondary">
        <span className="truncate">{label}</span>
        {icon}
      </div>
      <div className={cn('mt-2 text-2xl font-bold tracking-tight sm:text-[28px]', accent ? 'text-accent' : 'text-text-primary')}>
        {value}
      </div>
      {hint && <div className="mt-1 truncate text-xs text-text-secondary">{hint}</div>}
    </>
  )
  const cls = 'block rounded-2xl border border-border bg-surface p-4 sm:p-5'
  return to ? (
    <Link to={to} className={cn(cls, 'transition-colors hover:border-border-strong')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
