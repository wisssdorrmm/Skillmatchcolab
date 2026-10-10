import { useState } from 'react'
import { ArrowUpRight, CalendarDays, Check, Globe, MapPin, Swords, Trophy, Users } from 'lucide-react'
import { cn } from '../../lib/cn'
import { compactNumber } from '../../lib/format'
import { hostLabel, safeUrl } from '../../lib/safeUrl'
import { dateRange, deadline } from '../../lib/hackathonDates'
import type { Hackathon } from '../../types/database'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const TINTS = ['bg-accent/15 text-accent', 'bg-info/15 text-info', 'bg-warning/15 text-warning', 'bg-success/15 text-success']

/** The organiser's picture when we have one, otherwise a tinted tile. */
export function HackathonIcon({ hackathon, size = 'md' }: { hackathon: Pick<Hackathon, 'id' | 'image_url'>; size?: 'sm' | 'md' }) {
  const [broken, setBroken] = useState(false)
  const box = size === 'sm' ? 'h-11 w-11 rounded-xl' : 'h-14 w-14 rounded-2xl'
  const src = safeUrl(hackathon.image_url)
  if (src && !broken) {
    return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={cn(box, 'shrink-0 border border-border bg-surface-2 object-cover')} />
  }
  let h = 0
  for (let i = 0; i < hackathon.id.length; i++) h = (h * 33 + hackathon.id.charCodeAt(i)) >>> 0
  return (
    <span className={cn(box, 'flex shrink-0 items-center justify-center', TINTS[h % TINTS.length])}>
      <Swords size={size === 'sm' ? 20 : 24} />
    </span>
  )
}

interface CardProps {
  hackathon: Hackathon
  joined: boolean
  busy?: boolean
  onToggleJoin: (h: Hackathon) => void
  onShowMembers: (h: Hackathon) => void
}

export function HackathonCard({ hackathon: h, joined, busy, onToggleJoin, onShowMembers }: CardProps) {
  const due = deadline(h)
  const link = safeUrl(h.url)
  return (
    <article className="rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong sm:p-5">
      <div className="flex items-start gap-3.5">
        <HackathonIcon hackathon={h} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug text-text-primary">{h.title}</h3>
            <Badge tone={due.tone} className="mt-0.5 shrink-0">
              {due.label}
            </Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-text-secondary">
            {h.organizer && <span className="truncate">{h.organizer}</span>}
            <span className="inline-flex items-center gap-1">
              {h.is_online ? <Globe size={13} /> : <MapPin size={13} />}
              <span className="truncate">{h.location ?? (h.is_online ? 'Online' : 'In person')}</span>
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        {h.prize_text && (
          <Badge tone="accent" icon={<Trophy size={11} />}>
            {h.prize_text}
          </Badge>
        )}
        <Badge icon={<CalendarDays size={11} />}>{dateRange(h.starts_on, h.ends_on)}</Badge>
        {h.themes.slice(0, 2).map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-secondary">
          {h.participants > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users size={14} /> {compactNumber(h.participants)} signed up
            </span>
          )}
          {h.joined_count > 0 ? (
            <button type="button" onClick={() => onShowMembers(h)} className="font-medium text-accent hover:underline">
              {h.joined_count} from Cobuild
            </button>
          ) : (
            <span className="text-text-muted">Be the first from Cobuild</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-pressed={joined}
            disabled={busy}
            className={joined ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/15' : undefined}
            icon={joined ? <Check size={15} /> : undefined}
            onClick={() => onToggleJoin(h)}
          >
            {joined ? "I'm in" : 'Count me in'}
          </Button>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-hover"
              aria-label={`Open ${h.title} on ${hostLabel(link)}`}
            >
              View <ArrowUpRight size={15} />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
