import { useState } from 'react'
import { cn } from '../../lib/cn'
import { initials, isOnline } from '../../lib/format'

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
  '2xl': 'h-24 w-24 text-3xl',
} as const

const DOT = {
  xs: 'h-2 w-2',
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
  xl: 'h-4 w-4',
  '2xl': 'h-5 w-5',
} as const

// Stable, friendly background colours for people without a photo.
const TINTS = ['bg-[#2b3a1a] text-[#d4f75c]', 'bg-[#1d2a3d] text-[#8ec5ff]', 'bg-[#3a2236] text-[#f5a3e3]', 'bg-[#3a2e1a] text-[#fcd34d]', 'bg-[#1d3a33] text-[#6ee7c7]', 'bg-[#2e2440] text-[#c4b5fd]']

function tintFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}

interface AvatarProps {
  name?: string | null
  src?: string | null
  size?: keyof typeof SIZES
  lastSeen?: string | null
  showStatus?: boolean
  className?: string
  seed?: string
}

export function Avatar({ name, src, size = 'md', lastSeen, showStatus, className, seed }: AvatarProps) {
  const [broken, setBroken] = useState(false)
  const online = showStatus && isOnline(lastSeen)
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center overflow-hidden rounded-full font-semibold',
          SIZES[size],
          !(src && !broken) && tintFor(seed ?? name ?? '?'),
        )}
      >
        {src && !broken ? (
          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setBroken(true)} />
        ) : (
          initials(name)
        )}
      </span>
      {online && (
        <span
          className={cn('absolute bottom-0 right-0 rounded-full bg-success ring-2 ring-bg', DOT[size])}
          aria-label="Online"
        />
      )}
    </span>
  )
}

export function AvatarStack({ people, max = 4 }: { people: { id: string; name: string | null; avatar_url: string | null }[]; max?: number }) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} src={p.avatar_url} size="xs" className="ring-2 ring-surface rounded-full" seed={p.id} />
      ))}
      {extra > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-text-secondary ring-2 ring-surface">
          +{extra}
        </span>
      )}
    </div>
  )
}
