import type { ReactNode } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-surface-2', className)} />
}

export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  body?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center', className)}>
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-text-secondary">{icon}</div>}
      <p className="font-semibold text-text-primary">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-text-secondary">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-danger/20 bg-danger/5 px-6 py-8 text-center', className)}>
      <AlertTriangle size={22} className="text-danger" />
      <p className="mt-2 text-sm text-text-primary">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return <Loader2 aria-label={label} className={cn('animate-spin text-text-muted', className)} size={20} />
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <Spinner />
    </div>
  )
}

export function InPageSpinner() {
  return (
    <div className="flex justify-center py-20">
      <Spinner />
    </div>
  )
}
