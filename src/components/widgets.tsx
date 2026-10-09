import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Crown, Flame, HandCoins, Trophy } from 'lucide-react'
import { cn } from '../lib/cn'
import { compactNumber } from '../lib/format'
import type { LeaderboardRow, UserStats } from '../types/database'
import { levelProgress } from '../services/stats.service'
import type { ProjectCard } from '../services/projects.service'
import { Avatar } from './ui/Avatar'
import { ProgressBar } from './ui/ProgressBar'
import { Skeleton } from './ui/States'
import { VerifiedBadge } from './ui/VerifiedBadge'

export function RailCard({ title, to, children, className }: { title: string; to?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-5', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3>
        {to && (
          <Link to={to} className="text-[13px] font-medium text-accent hover:underline">
            See all
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

const RANK_STYLES = ['text-gold', 'text-silver', 'text-bronze']

export function TopBuildersList({ rows, loading, compact }: { rows: LeaderboardRow[] | null; loading?: boolean; compact?: boolean }) {
  if (loading && !rows) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>
    )
  }
  if (!rows?.length) {
    return <p className="text-sm text-text-secondary">No one's on the board yet. Ship a roadmap step to be first.</p>
  }
  return (
    <ol className="flex flex-col gap-1">
      {rows.map((r) => (
        <li key={r.user_id}>
          <Link to={`/u/${r.user_id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2">
            <span className={cn('w-5 text-center text-sm font-bold tabular-nums', RANK_STYLES[r.rank - 1] ?? 'text-text-muted')}>{r.rank}</span>
            <Avatar name={r.name} src={r.avatar_url} size="sm" seed={r.user_id} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-text-primary">
                <span className="truncate">{r.name}</span>
                <VerifiedBadge show={r.is_verified} size={14} />
              </span>
              {!compact && <span className="block truncate text-xs text-text-secondary">{r.primary_role ?? 'Builder'}</span>}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-accent">{compactNumber(r.xp)} XP</span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

/** Gold / silver / bronze podium for the top 3 builders. */
export function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const order = [rows[1], rows[0], rows[2]]
  const heights = ['h-16', 'h-24', 'h-12']
  const rings = ['ring-silver', 'ring-gold', 'ring-bronze']
  const labels = ['2', '1', '3']
  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {order.map((r, i) =>
        r ? (
          <Link key={r.user_id} to={`/u/${r.user_id}`} className="flex min-w-0 flex-col items-center text-center">
            {i === 1 && <Crown size={20} className="mb-1 text-gold" />}
            <Avatar name={r.name} src={r.avatar_url} size={i === 1 ? 'lg' : 'md'} seed={r.user_id} className={cn('rounded-full ring-2', rings[i])} />
            <span className="mt-2 flex w-full items-center justify-center gap-1 text-sm font-semibold text-text-primary">
              <span className="truncate">{r.name}</span>
              <VerifiedBadge show={r.is_verified} size={14} />
            </span>
            <span className="text-xs font-semibold text-accent">{compactNumber(r.xp)} XP</span>
            <div className={cn('mt-2 flex w-full items-start justify-center rounded-t-xl border border-b-0 border-border bg-surface-2 pt-2', heights[i])}>
              <span className={cn('text-lg font-bold', i === 1 ? 'text-gold' : i === 0 ? 'text-silver' : 'text-bronze')}>{labels[i]}</span>
            </div>
          </Link>
        ) : (
          <div key={i} />
        ),
      )}
    </div>
  )
}

export function StreakSummary({ stats }: { stats: UserStats | null }) {
  if (!stats) return <Skeleton className="h-24" />
  const pct = levelProgress(stats)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', stats.current_streak > 0 ? 'bg-warning/15 text-warning' : 'bg-surface-2 text-text-muted')}>
          <Flame size={22} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-text-primary">
            {stats.current_streak > 0 ? `${stats.current_streak}-day streak` : 'Start a streak'}
          </p>
          <p className="text-[13px] text-text-secondary">
            {stats.active_today
              ? 'You showed up today. Nice.'
              : stats.current_streak > 0
                ? 'Post or ship something today to keep it.'
                : `Post or ship something today.${stats.best_streak ? ` Best: ${stats.best_streak} days.` : ''}`}
          </p>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="font-semibold text-text-primary">Level {stats.level}</span>
          <span className="tabular-nums text-text-secondary">
            {stats.xp} / {stats.next_level_xp} XP
          </span>
        </div>
        <ProgressBar value={pct} size="sm" label="Level progress" />
      </div>
    </div>
  )
}

export function MiniProjectRow({ project }: { project: ProjectCard }) {
  return (
    <Link to={`/project/${project.id}`} className="-mx-2 block rounded-xl px-2 py-2 hover:bg-surface-2">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-semibold text-text-primary">{project.title}</span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary">{project.progress}%</span>
      </div>
      <ProgressBar value={project.progress} size="xs" className="mt-2" label={`${project.title} progress`} />
    </Link>
  )
}

export function FundingPromo({ className }: { className?: string }) {
  return (
    <Link
      to="/funding"
      className={cn(
        'group flex items-center gap-4 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.12] to-transparent p-5 transition-colors hover:border-accent/50',
        className,
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
        <HandCoins size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-text-primary">Need funding?</span>
        <span className="block text-[13px] text-text-secondary">Grants, credits and investors — apply in 5 minutes.</span>
      </span>
      <ArrowRight size={18} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

export function LeaderboardTeaser() {
  return (
    <Link to="/leaderboard" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
      <Trophy size={14} /> Full leaderboard
    </Link>
  )
}
