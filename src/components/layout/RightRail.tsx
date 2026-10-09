import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { getLeaderboard, getUserStats } from '../../services/stats.service'
import { listProjects } from '../../services/projects.service'
import { FundingPromo, MiniProjectRow, RailCard, StreakSummary, TopBuildersList } from '../widgets'
import { BRAND } from '../../config/brand'

/** Desktop-only column on the right: streak, top builders, active projects, funding. */
export function RightRail() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const onHome = pathname === '/'

  const stats = useAsync(() => (user ? getUserStats(user.id) : Promise.resolve(null)), [user?.id])
  const top = useAsync(async () => {
    const week = await getLeaderboard('week', 5)
    return week.length ? { rows: week, label: 'this week' } : { rows: await getLeaderboard('all', 5), label: 'all time' }
  }, [])
  const active = useAsync(() => listProjects({ source: 'community', sort: 'updated', limit: 4 }), [])

  // Keep the rail fresh as people move around the app (silent refresh, no flicker).
  const refreshStats = stats.refresh
  const refreshTop = top.refresh
  const refreshActive = active.refresh
  useEffect(() => {
    refreshStats()
    refreshTop()
    refreshActive()
  }, [pathname, refreshStats, refreshTop, refreshActive])

  return (
    <aside className="sticky top-0 hidden h-dvh w-[320px] shrink-0 flex-col gap-4 overflow-y-auto py-10 xl:flex" aria-label="Highlights">
      <RailCard title="Your streak">
        <StreakSummary stats={stats.data} />
      </RailCard>

      {!onHome && (
        <RailCard title={`Top builders${top.data ? ` · ${top.data.label}` : ''}`} to="/leaderboard">
          <TopBuildersList rows={top.data?.rows ?? null} loading={top.loading} compact />
        </RailCard>
      )}

      <RailCard title="Building right now" to="/explore">
        {active.data?.items.length ? (
          <div className="flex flex-col">
            {active.data.items.map((p) => (
              <MiniProjectRow key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            No community projects yet.{' '}
            <Link to="/projects/new" className="font-medium text-accent hover:underline">
              Start one
            </Link>
          </p>
        )}
      </RailCard>

      <FundingPromo />

      <p className="px-1 text-xs text-text-muted">
        <Link to="/terms" className="hover:text-text-secondary">
          Terms
        </Link>{' '}
        ·{' '}
        <Link to="/privacy" className="hover:text-text-secondary">
          Privacy
        </Link>{' '}
        · © {new Date().getFullYear()} {BRAND.name}
      </p>
    </aside>
  )
}
