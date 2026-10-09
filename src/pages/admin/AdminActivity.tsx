import { Link } from 'react-router-dom'
import { FolderKanban, HandCoins, MessagesSquare, Rocket, UserPlus, Users, type LucideIcon } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { cn } from '../../lib/cn'
import { lastActiveLabel, timeAgo } from '../../lib/format'
import { getRecentActivity, listMembers, type ActivityEvent } from '../../services/admin.service'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/ui/States'

const KIND: Record<ActivityEvent['kind'], { icon: LucideIcon; tone: string }> = {
  signup: { icon: UserPlus, tone: 'bg-info/15 text-info' },
  project: { icon: FolderKanban, tone: 'bg-accent/15 text-accent' },
  step: { icon: Rocket, tone: 'bg-success/15 text-success' },
  team: { icon: Users, tone: 'bg-surface-hover text-text-secondary' },
  post: { icon: MessagesSquare, tone: 'bg-surface-hover text-text-secondary' },
  funding: { icon: HandCoins, tone: 'bg-warning/15 text-warning' },
}

export function ActivityFeed({ events, loading, error, onRetry }: { events: ActivityEvent[] | null; loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading && !events) return <ListSkeleton rows={4} />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (!events?.length) return <EmptyState title="Nothing yet" body="Signups, projects, posts and shipped steps will appear here." />
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {events.map((e, i) => {
        const k = KIND[e.kind] ?? KIND.post
        const Icon = k.icon
        const body = (
          <>
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', k.tone)}>
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="font-semibold text-text-primary">{e.actor_name ?? 'Someone'}</span> <span className="text-text-secondary">{e.summary}</span>
            </span>
            <span className="shrink-0 text-xs text-text-muted">{timeAgo(e.at)}</span>
          </>
        )
        return e.link ? (
          <Link key={`${e.kind}-${e.at}-${i}`} to={e.link} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50">
            {body}
          </Link>
        ) : (
          <div key={`${e.kind}-${e.at}-${i}`} className="flex items-center gap-3 px-4 py-3">
            {body}
          </div>
        )
      })}
    </div>
  )
}

export default function AdminActivity() {
  const events = useAsync(() => getRecentActivity(100), [])
  const people = useAsync(() => listMembers('', 200, 0), [])
  const online = (people.data ?? []).filter((m) => m.last_seen_at && Date.now() - new Date(m.last_seen_at).getTime() < 3 * 60_000)
  const today = (people.data ?? []).filter((m) => m.last_seen_at && new Date(m.last_seen_at).toDateString() === new Date().toDateString())

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Live activity</h1>
      <p className="mt-1 text-text-secondary">Who's here right now and what they're doing.</p>

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-[17px] font-semibold text-text-primary">
          <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" /> Online now · {online.length}
        </h2>
        {people.loading ? (
          <ListSkeleton rows={1} />
        ) : online.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary">Nobody is online at the moment.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {online.map((m) => (
              <Link key={m.id} to={`/u/${m.id}`} className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 hover:border-border-strong">
                <Avatar name={m.name} src={m.avatar_url} size="sm" lastSeen={m.last_seen_at} showStatus seed={m.id} />
                <span className="text-sm text-text-primary">{m.name ?? m.email}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[17px] font-semibold text-text-primary">Active today · {today.length}</h2>
        {!people.loading && (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {today.slice(0, 30).map((m) => (
              <Link key={m.id} to={`/u/${m.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2/50">
                <Avatar name={m.name} src={m.avatar_url} size="sm" lastSeen={m.last_seen_at} showStatus seed={m.id} />
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{m.name ?? m.email}</span>
                <span className="shrink-0 text-xs text-text-muted">{lastActiveLabel(m.last_seen_at)}</span>
              </Link>
            ))}
            {today.length === 0 && <p className="px-4 py-4 text-sm text-text-secondary">No one yet today.</p>}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[17px] font-semibold text-text-primary">Everything that happened</h2>
        <ActivityFeed events={events.data} loading={events.loading} error={events.error} onRetry={events.reload} />
      </section>
    </div>
  )
}
