import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { cn } from '../lib/cn'
import { compactNumber } from '../lib/format'
import { getLeaderboard, getUserStats, type Period } from '../services/stats.service'
import { PageHeader } from '../components/ui/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { Avatar } from '../components/ui/Avatar'
import { Card } from '../components/ui/Card'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { Podium } from '../components/widgets'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'

const XP_RULES = [
  ['Post a project', '+40'],
  ['Finish a roadmap step', '+ its %'],
  ['Join a team', '+20'],
  ['Get a hype on your project', '+5'],
  ['Be active for a day', '+3'],
  ['Post in the community', '+2 (10/day)'],
]

export default function Leaderboard() {
  const { user, profile } = useAuth()
  const [period, setPeriod] = useState<Period>('week')
  const { data, loading, error, reload } = useAsync(() => getLeaderboard(period, 50), [period])
  const me = useAsync(() => getUserStats(user!.id), [user?.id])
  const rows = data ?? []
  const myRow = rows.find((r) => r.user_id === user?.id)

  return (
    <div>
      <PageHeader title="Leaderboard" subtitle="Top builders on Cobuild. Ship, team up and help others to climb." />
      <Tabs<Period>
        value={period}
        onChange={setPeriod}
        tabs={[
          { value: 'week', label: 'This week' },
          { value: 'month', label: 'This month' },
          { value: 'all', label: 'All time' },
        ]}
      />

      <div className="mt-5">
        {loading ? (
          <ListSkeleton rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Trophy size={22} />} title="The board is empty" body="Finish a roadmap step or post a project to get on it." />
        ) : (
          <>
            {rows.length >= 3 && (
              <Card className="mb-4 p-5 pt-6">
                <Podium rows={rows.slice(0, 3)} />
              </Card>
            )}
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {rows.slice(rows.length >= 3 ? 3 : 0).map((r) => (
                <Link
                  key={r.user_id}
                  to={`/u/${r.user_id}`}
                  className={cn('flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50', r.user_id === user?.id && 'bg-accent/[0.06]')}
                >
                  <span className="w-7 text-center text-sm font-bold tabular-nums text-text-muted">{r.rank}</span>
                  <Avatar name={r.name} src={r.avatar_url} size="md" seed={r.user_id} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-text-primary">
                      <span className="inline-flex max-w-full items-center gap-1 align-middle">
                        <span className="truncate">{r.name}</span>
                        <VerifiedBadge show={r.is_verified} size={15} />
                      </span>{' '}
                      {r.user_id === user?.id && <span className="text-xs font-medium text-accent">(you)</span>}
                    </span>
                    <span className="block truncate text-[13px] text-text-secondary">
                      {r.primary_role ?? 'Builder'} · {r.projects} projects · {r.steps} steps
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-accent">{compactNumber(r.xp)} XP</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {me.data && !myRow && (
        <Card className="sticky bottom-24 mt-4 flex items-center gap-3 border-accent/30 p-4 lg:bottom-4">
          <Avatar name={profile?.name} src={profile?.avatar_url} size="md" seed={user?.id} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-text-primary">You · Level {me.data.level}</p>
            <p className="text-[13px] text-text-secondary">{me.data.xp > 0 ? `All-time rank #${me.data.rank}` : 'Earn XP to get ranked'}</p>
          </div>
          <span className="font-semibold tabular-nums text-accent">{me.data.xp} XP</span>
        </Card>
      )}

      <Card className="mt-8 p-5 sm:p-6">
        <h2 className="font-semibold text-text-primary">How to earn XP</h2>
        <ul className="mt-3 divide-y divide-border">
          {XP_RULES.map(([what, xp]) => (
            <li key={what} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-text-secondary">{what}</span>
              <span className="font-semibold text-accent">{xp}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
