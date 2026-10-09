import { BadgeCheck } from 'lucide-react'
import { cn } from '../../lib/cn'

/** Lime check shown next to the names of builders an admin has verified. */
export function VerifiedBadge({ show, size = 16, className }: { show?: boolean | null; size?: number; className?: string }) {
  if (!show) return null
  return (
    <span className={cn('inline-flex shrink-0 text-accent', className)} title="Verified" aria-label="Verified">
      <BadgeCheck size={size} className="fill-accent stroke-accent-ink" />
    </span>
  )
}
