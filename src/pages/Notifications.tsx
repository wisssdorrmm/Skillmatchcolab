import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Flame, HandCoins, Megaphone, MessageCircle, Rocket, ShieldCheck, Sparkles, UserCheck, UserPlus, type LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUnread } from '../context/UnreadContext'
import { useAsync } from '../hooks/useAsync'
import { cn } from '../lib/cn'
import { timeAgo } from '../lib/format'
import { listNotifications, markAllAsRead, markAsRead, notificationHref } from '../services/notifications.service'
import type { AppNotification } from '../types/database'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'

const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  application_received: { icon: UserPlus, tone: 'bg-info/15 text-info' },
  application_status: { icon: UserCheck, tone: 'bg-success/15 text-success' },
  direct_message: { icon: MessageCircle, tone: 'bg-surface-hover text-text-secondary' },
  community_reply: { icon: MessageCircle, tone: 'bg-surface-hover text-text-secondary' },
  project_match: { icon: Sparkles, tone: 'bg-accent/15 text-accent' },
  milestone_done: { icon: Rocket, tone: 'bg-accent/15 text-accent' },
  project_upvote: { icon: Flame, tone: 'bg-warning/15 text-warning' },
  funding_status: { icon: HandCoins, tone: 'bg-accent/15 text-accent' },
  funding_new: { icon: HandCoins, tone: 'bg-accent/15 text-accent' },
  admin_granted: { icon: ShieldCheck, tone: 'bg-accent/15 text-accent' },
  broadcast: { icon: Megaphone, tone: 'bg-info/15 text-info' },
}

export default function Notifications() {
  const { user } = useAuth()
  const unread = useUnread()
  const navigate = useNavigate()
  const { data, loading, error, reload, setData } = useAsync(() => listNotifications(user!.id), [user?.id])
  const hasUnread = (data ?? []).some((n) => !n.is_read)

  const open = (n: AppNotification) => {
    if (!n.is_read) {
      setData((list) => list?.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) ?? null)
      markAsRead(n.id).then(unread.refresh).catch(() => {})
    }
    const href = notificationHref(n)
    if (href) navigate(href)
  }

  const readAll = async () => {
    setData((list) => list?.map((x) => ({ ...x, is_read: true })) ?? null)
    await markAllAsRead(user!.id).catch(() => {})
    unread.refresh()
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={
          hasUnread ? (
            <Button variant="ghost" size="sm" icon={<CheckCheck size={16} />} onClick={readAll}>
              Mark all read
            </Button>
          ) : undefined
        }
      />
      {loading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={<Bell size={22} />} title="You're all caught up" body="Applications, hypes, shipped steps and replies will show up here." />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {data.map((n) => {
            const meta = ICONS[n.type] ?? { icon: Bell, tone: 'bg-surface-hover text-text-secondary' }
            const Icon = meta.icon
            return (
              <button key={n.id} onClick={() => open(n)} className={cn('flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-surface-2/50', !n.is_read && 'bg-accent/[0.04]')}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.tone)}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[15px]', n.is_read ? 'font-medium text-text-primary' : 'font-semibold text-text-primary')}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block line-clamp-2 text-sm text-text-secondary">{n.body}</span>}
                  <span className="mt-1 block text-xs text-text-muted">{timeAgo(n.created_at)}</span>
                </span>
                {!n.is_read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
