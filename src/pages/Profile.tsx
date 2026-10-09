import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Award,
  Bookmark,
  ChevronRight,
  Flame,
  FolderKanban,
  Globe,
  HandCoins,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Pencil,
  Settings,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { cn } from '../lib/cn'
import { errorMessage } from '../lib/errors'
import { formatDate, lastActiveLabel } from '../lib/format'
import { EXPERIENCE, labelFor } from '../lib/constants'
import { getProfile, getSkillsForUser } from '../services/profiles.service'
import { achievementsFor, getUserStats, levelProgress } from '../services/stats.service'
import { listMyProjects } from '../services/projects.service'
import { startConversation } from '../services/conversations.service'
import { Avatar } from '../components/ui/Avatar'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, Section } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Tag } from '../components/ui/Badge'
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { GithubIcon } from '../components/ui/GithubIcon'
import { ProjectCard } from '../components/project/ProjectCard'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'

function MenuLink({ to, icon: Icon, label, onClick, danger }: { to?: string; icon: LucideIcon; label: string; onClick?: () => void; danger?: boolean }) {
  const cls = cn('flex h-14 w-full items-center gap-3 px-4 text-left text-[15px] font-medium hover:bg-surface-2/50', danger ? 'text-danger' : 'text-text-primary')
  const body = (
    <>
      <Icon size={19} className={danger ? '' : 'text-text-secondary'} />
      <span className="flex-1">{label}</span>
      {!danger && <ChevronRight size={17} className="text-text-muted" />}
    </>
  )
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {body}
    </button>
  )
}

export default function Profile() {
  const params = useParams()
  const { user, profile: me, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const id = params.id ?? user?.id ?? ''
  const isMe = id === user?.id
  const [opening, setOpening] = useState(false)

  const profile = useAsync(() => (isMe ? Promise.resolve(me) : getProfile(id)), [id, isMe, me])
  const stats = useAsync(() => getUserStats(id), [id])
  const skills = useAsync(() => getSkillsForUser(id), [id])
  const projects = useAsync(() => listMyProjects(id), [id])

  if (params.id && params.id === user?.id) return <Navigate to="/profile" replace />
  if (profile.loading && !profile.data) return <ListSkeleton rows={3} />
  if (profile.error) return <ErrorState message={profile.error} onRetry={profile.reload} />
  const p = profile.data
  if (!p) return <EmptyState title="Builder not found" action={<ButtonLink to="/people">Find people</ButtonLink>} />

  const s = stats.data
  const shipped = (projects.data?.owned ?? []).some((pr) => pr.progress >= 100)
  const allProjects = [...(projects.data?.owned ?? []), ...(projects.data?.joined ?? [])]

  const message = async () => {
    setOpening(true)
    try {
      navigate(`/messages/${await startConversation(id)}`)
    } catch (err) {
      toast(errorMessage(err), 'error')
      setOpening(false)
    }
  }

  const github = p.github_url
  const x = p.x_handle

  return (
    <div>
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-accent/25 via-accent/[0.06] to-transparent sm:h-28" />
        <div className="-mt-12 px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="flex items-end justify-between gap-3">
            <Avatar name={p.name} src={p.avatar_url} size="2xl" lastSeen={p.show_online ? p.last_seen_at : null} showStatus seed={p.id} className="rounded-full ring-4 ring-surface" />
            <div className="flex gap-2 pb-1">
              {isMe ? (
                <ButtonLink to="/settings/profile" variant="secondary" size="sm" icon={<Pencil size={15} />}>
                  Edit profile
                </ButtonLink>
              ) : (
                <Button size="sm" icon={<MessageCircle size={15} />} loading={opening} onClick={message}>
                  Message
                </Button>
              )}
            </div>
          </div>
          <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold tracking-tight text-text-primary">
            {p.name}
            <VerifiedBadge show={p.is_verified} size={22} />
          </h1>
          <p className="text-[15px] text-text-secondary">
            {p.username ? `@${p.username} · ` : ''}
            {p.primary_role ?? 'Builder'}
            {p.experience_level ? ` · ${labelFor(EXPERIENCE, p.experience_level)}` : ''}
          </p>
          {p.bio && <p className="mt-3 text-[15px] leading-relaxed text-text-primary">{p.bio}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-text-secondary">
            {p.country && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} /> {p.country}
              </span>
            )}
            {github && (
              <a href={github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-text-primary">
                <GithubIcon size={14} /> GitHub
              </a>
            )}
            {x && (
              <a href={`https://x.com/${x}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-text-primary">
                𝕏 @{x}
              </a>
            )}
            {p.website_url && (
              <a href={p.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-text-primary">
                <Globe size={14} /> Website
              </a>
            )}
            <span>Joined {formatDate(p.created_at)}</span>
            {!isMe && p.show_online && <span>{lastActiveLabel(p.last_seen_at)}</span>}
          </div>
        </div>
      </Card>

      {/* Level + streak */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          {s ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">Level</p>
                <p className="text-sm font-semibold text-accent">{s.xp > 0 ? `#${s.rank} all time` : 'Unranked'}</p>
              </div>
              <p className="mt-1 text-3xl font-bold text-text-primary">{s.level}</p>
              <ProgressBar value={levelProgress(s)} className="mt-3" label="Level progress" />
              <p className="mt-2 text-xs text-text-secondary">
                {s.xp} XP · {s.next_level_xp - s.xp} XP to level {s.level + 1}
              </p>
            </>
          ) : (
            <Skeleton className="h-24" />
          )}
        </Card>
        <Card className="p-5">
          {s ? (
            <>
              <p className="text-sm text-text-secondary">Streak</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-bold text-text-primary">
                {s.current_streak} <Flame size={24} className={s.current_streak ? 'text-warning' : 'text-text-muted'} />
              </p>
              <p className="mt-3 text-xs text-text-secondary">
                Best {s.best_streak} {s.best_streak === 1 ? 'day' : 'days'} · {s.active_days} active days
              </p>
            </>
          ) : (
            <Skeleton className="h-24" />
          )}
        </Card>
      </div>

      {s && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {[
            ['Projects', s.projects],
            ['Steps', s.steps],
            ['Teams', s.teams],
            ['Posts', s.posts],
            ['Hypes', s.hypes],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border bg-surface p-3 text-center">
              <p className="text-xl font-bold text-text-primary">{value}</p>
              <p className="text-xs text-text-secondary">{label}</p>
            </div>
          ))}
        </div>
      )}

      {s && (
        <Section title="Achievements">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {achievementsFor(s, shipped).map((a) => (
              <div key={a.key} className={cn('flex items-center gap-3 rounded-2xl border p-3', a.earned ? 'border-accent/30 bg-accent/[0.06]' : 'border-border bg-surface opacity-60')}>
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', a.earned ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-text-muted')}>
                  {a.earned ? <Award size={18} /> : <Lock size={16} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text-primary">{a.label}</span>
                  <span className="block truncate text-xs text-text-secondary">{a.description}</span>
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!!skills.data?.length && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {skills.data.map((sk) => (
              <Tag key={sk.id}>{sk.name}</Tag>
            ))}
          </div>
        </Section>
      )}

      <Section title={isMe ? 'Your projects' : 'Projects'}>
        {projects.loading ? (
          <ListSkeleton rows={2} />
        ) : allProjects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={22} />}
            title={isMe ? 'No projects yet' : `${p.name?.split(' ')[0] ?? 'They'} hasn't posted a project yet`}
            action={isMe ? <ButtonLink to="/projects/new">Create a project</ButtonLink> : undefined}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {allProjects.map((pr) => (
              <ProjectCard key={pr.id} project={pr} />
            ))}
          </div>
        )}
      </Section>

      {isMe && (
        <Section title="More">
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            <MenuLink to="/my-projects" icon={FolderKanban} label="My projects" />
            <MenuLink to="/explore?tab=saved" icon={Bookmark} label="Saved projects" />
            <MenuLink to="/funding" icon={HandCoins} label="Funding" />
            <MenuLink to="/leaderboard" icon={Trophy} label="Leaderboard" />
            {isAdmin && <MenuLink to="/admin" icon={ShieldCheck} label="Admin panel" />}
            <MenuLink to="/settings" icon={Settings} label="Settings" />
            <MenuLink icon={LogOut} label="Log out" danger onClick={() => signOut()} />
          </div>
        </Section>
      )}
    </div>
  )
}
