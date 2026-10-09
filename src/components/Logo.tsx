import { Link } from 'react-router-dom'
import { BRAND } from '../config/brand'
import { cn } from '../lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink', className)}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14.5 6.5a6 6 0 1 0 0 11" />
        <path d="M18.5 9.5v5" />
        <path d="M16 12h5" />
      </svg>
    </span>
  )
}

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5', className)} aria-label={`${BRAND.name} home`}>
      <LogoMark />
      <span className="text-[22px] font-bold tracking-tight text-text-primary">
        {BRAND.name.slice(0, 2)}
        <span className="text-accent">{BRAND.name.slice(2)}</span>
      </span>
    </Link>
  )
}
