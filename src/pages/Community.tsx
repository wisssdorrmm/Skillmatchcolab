import { Link } from 'react-router-dom'
import { Flame, Hash, Lock, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { cn } from '../lib/cn'
import { listRooms } from '../services/community.service'
import { getPlatformStats, getUserStats } from '../services/stats.service'
import type { CommunityRoom } from '../types/database'
import { PageHeader } from '../components/ui/PageHeader'
import { ButtonLink } from '../components/ui/Button'
import { ErrorState, Skeleton } from '../components/ui/States'

const CATEGORY_ORDER = ['Start here', 'Build', 'Opportunities', 'Stacks']

function RoomLink({ room }: { room: CommunityRoom }) {
  const unread = room.unread ?? 0
  return (
    <Link
      to={`/community/${room.slug}`}
      className="-mx-2 flex h-12 items-center gap-3 rounded-xl px-3 transition-colors hover:bg-surface-2"
    >
      {room.is_locked ? <Lock size={17} className="shrink-0 text-text-muted" /> : <Hash size={18} className="shrink-0 text-text-muted" />}
      <span className={cn('min-w-0 flex-1 truncate text-[16px]', unread > 0 ? 'font-semibold text-text-primary' : 'text-text-secondary')}>
        {room.name}
      </span>
      {unread > 0 && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-ink">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}

export default function Community() {
  const { user } = useAuth()
  const rooms = useAsync(listRooms, [])
  const platform = useAsync(getPlatformStats, [])
  const stats = useAsync(() => getUserStats(user!.id), [user?.id])

  const groups = new Map<string, CommunityRoom[]>()
  for (const r of rooms.data ?? []) {
    const list = groups.get(r.category) ?? []
    list.push(r)
    groups.set(r.category, list)
  }
  const rank = (c: string) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length)
  const orderedGroups = [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]))

  const s = stats.data

  return (
    <div>
      <PageHeader
        title="Community"
        subtitle={
          platform.data ? (
            <span className="inline-flex items-center gap-2">
              {platform.data.builders} builders
              <span className="inline-flex items-center gap-1.5 text-success">
                <span className="h-2 w-2 rounded-full bg-success" /> {platform.data.online} online
              </span>
            </span>
          ) : (
            'Talk, ask, share and team up.'
          )
        }
        actions={
          <ButtonLink to="/people" variant="outline" size="sm" icon={<Search size={16} />}>
            Find people
          </ButtonLink>
        }
      />

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', s?.current_streak ? 'bg-warning/15 text-warning' : 'bg-surface-2 text-text-muted')}>
          <Flame size={22} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-text-primary">
            {!s ? 'Your streak' : s.active_today ? `${s.current_streak}-day streak — you're on it` : s.current_streak ? `Keep your ${s.current_streak}-day streak` : 'Start a streak'}
          </p>
          <p className="text-sm text-text-secondary">
            {s?.active_today ? 'Come back tomorrow to keep it going.' : 'Post in any room today to keep it alive.'}
            {s && s.best_streak > 0 ? ` Your best is ${s.best_streak} ${s.best_streak === 1 ? 'day' : 'days'}.` : ''}
          </p>
        </div>
      </div>

      {rooms.loading ? (
        <div className="mt-6 grid gap-x-10 gap-y-2 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : rooms.error ? (
        <ErrorState className="mt-6" message={rooms.error} onRetry={rooms.reload} />
      ) : (
        <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {orderedGroups.map(([category, list]) => (
            <section key={category}>
              <h2 className="mb-1 px-1 text-[13px] font-medium text-text-muted">{category}</h2>
              <div className="flex flex-col">
                {list.map((r) => (
                  <RoomLink key={r.id} room={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
