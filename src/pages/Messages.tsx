import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Inbox, MessageCirclePlus, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { cn } from '../lib/cn'
import { timeAgo } from '../lib/format'
import { listConversations } from '../services/conversations.service'
import { listMyChatThreads } from '../services/members.service'
import { listMyApplicantThreads, listMyOwnerThreads } from '../services/directMessages.service'
import { getReadTimestamps } from '../services/chatReads.service'
import { PageHeader } from '../components/ui/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { Avatar } from '../components/ui/Avatar'
import { ButtonLink } from '../components/ui/Button'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'

type Tab = 'direct' | 'teams' | 'applications'

interface ThreadRow {
  key: string
  to: string
  title: string
  subtitle: string
  at: string | null
  unread: number
  avatar: { name: string | null; src: string | null; seed: string; lastSeen?: string | null }
  icon?: 'project'
}

function Row({ t }: { t: ThreadRow }) {
  return (
    <Link to={t.to} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/50">
      {t.icon === 'project' ? (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-secondary">
          <FolderKanban size={20} />
        </span>
      ) : (
        <Avatar name={t.avatar.name} src={t.avatar.src} size="lg" seed={t.avatar.seed} lastSeen={t.avatar.lastSeen} showStatus />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn('truncate text-[15px]', t.unread ? 'font-bold text-text-primary' : 'font-semibold text-text-primary')}>{t.title}</p>
          {t.at && <span className="shrink-0 text-xs text-text-muted">{timeAgo(t.at)}</span>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={cn('truncate text-sm', t.unread ? 'text-text-primary' : 'text-text-secondary')}>{t.subtitle}</p>
          {t.unread > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">{t.unread}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function Messages() {
  const { user } = useAuth()
  const uid = user?.id ?? ''
  const [tab, setTab] = useState<Tab>('direct')

  const direct = useAsync(async (): Promise<ThreadRow[]> => {
    const list = await listConversations()
    return list.map((c) => ({
      key: c.id,
      to: `/messages/${c.id}`,
      title: c.other_name ?? 'Builder',
      subtitle: `${c.last_sender === uid ? 'You: ' : ''}${c.last_body ?? ''}`,
      at: c.last_message_at,
      unread: c.unread,
      avatar: { name: c.other_name, src: c.other_avatar, seed: c.other_id, lastSeen: c.other_last_seen },
    }))
  }, [uid])

  const teams = useAsync(async (): Promise<ThreadRow[]> => {
    const [threads, reads] = await Promise.all([listMyChatThreads(uid), getReadTimestamps(uid).catch(() => ({}) as Record<string, string>)])
    return threads.map((t) => ({
      key: t.project_id,
      to: `/chats/${t.project_id}`,
      title: t.project_title,
      subtitle: t.last_message ?? 'No messages yet — say hi to your team',
      at: t.last_message_at,
      unread: t.last_message_at && (!reads[t.project_id] || reads[t.project_id] < t.last_message_at) ? 1 : 0,
      avatar: { name: t.project_title, src: null, seed: t.project_id },
      icon: 'project' as const,
    }))
  }, [uid])

  const apps = useAsync(async (): Promise<ThreadRow[]> => {
    const [owner, applicant] = await Promise.all([listMyOwnerThreads(uid), listMyApplicantThreads(uid)])
    const rows: ThreadRow[] = [
      ...owner.map((t) => ({
        key: `o-${t.project_id}-${t.applicant_id}`,
        to: `/project/${t.project_id}/messages/${t.applicant_id}`,
        title: t.applicant?.name ?? 'Applicant',
        subtitle: `${t.projects?.title ?? 'Project'} · ${t.text}`,
        at: t.created_at,
        unread: 0,
        avatar: { name: t.applicant?.name ?? null, src: t.applicant?.avatar_url ?? null, seed: t.applicant_id },
      })),
      ...applicant.map((t) => ({
        key: `a-${t.project_id}`,
        to: `/project/${t.project_id}/messages/${uid}`,
        title: t.projects?.title ?? 'Project',
        subtitle: t.text,
        at: t.created_at,
        unread: 0,
        avatar: { name: t.projects?.title ?? null, src: null, seed: t.project_id },
        icon: 'project' as const,
      })),
    ]
    return rows.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
  }, [uid])

  const current = tab === 'direct' ? direct : tab === 'teams' ? teams : apps
  const directUnread = (direct.data ?? []).reduce((n, t) => n + t.unread, 0)

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Chat with builders, your teams and applicants."
        actions={
          <ButtonLink to="/people" size="sm" icon={<MessageCirclePlus size={16} />}>
            New
          </ButtonLink>
        }
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'direct', label: 'Direct', count: directUnread },
          { value: 'teams', label: 'Teams', count: (teams.data ?? []).filter((t) => t.unread).length },
          { value: 'applications', label: 'Applications' },
        ]}
      />
      <div className="mt-5">
        {current.loading ? (
          <ListSkeleton rows={4} />
        ) : current.error ? (
          <ErrorState message={current.error} onRetry={current.reload} />
        ) : !current.data?.length ? (
          tab === 'direct' ? (
            <EmptyState
              icon={<Inbox size={22} />}
              title="No conversations yet"
              body="Find a builder and say hi — great teams start with one message."
              action={<ButtonLink to="/people">Find people</ButtonLink>}
            />
          ) : tab === 'teams' ? (
            <EmptyState
              icon={<FolderKanban size={22} />}
              title="No team chats yet"
              body="Every project you create or join gets a team chat."
              action={<ButtonLink to="/explore?tab=community">Find a team</ButtonLink>}
            />
          ) : (
            <EmptyState icon={<UserPlus size={22} />} title="No application threads" body="Messages with applicants (or project owners) show up here." />
          )
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {current.data.map((t) => (
              <Row key={t.key} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
