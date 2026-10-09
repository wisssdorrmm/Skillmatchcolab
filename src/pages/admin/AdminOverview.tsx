import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { formatMoney } from '../../lib/format'
import { getActiveSeries, getAdminOverview, getMemberGrowth, getRecentActivity } from '../../services/admin.service'
import { StatCard } from '../../components/ui/Card'
import { Tabs } from '../../components/ui/Tabs'
import { ErrorState, Skeleton } from '../../components/ui/States'
import { AreaLineChart, ColumnChart, type ChartPoint } from '../../components/admin/Charts'
import { ActivityFeed } from './AdminActivity'

type Range = '7' | '30' | '90' | '365' | 'all'
const RANGES: { value: Range; label: string }[] = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
  { value: '365', label: '1Y' },
  { value: 'all', label: 'All' },
]

const short = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function AdminOverview() {
  const [range, setRange] = useState<Range>('30')
  const days = range === 'all' ? null : Number(range)
  const ov = useAsync(getAdminOverview, [])
  const growth = useAsync(() => getMemberGrowth(days), [days])
  const active = useAsync(() => getActiveSeries(30), [])
  const recent = useAsync(() => getRecentActivity(12), [])

  const o = ov.data
  const g = growth.data ?? []
  const totalNow = g.length ? g[g.length - 1].total : 0
  const totalStart = g.length ? g[0].total - g[0].joins : 0
  const joined = totalNow - totalStart
  const busiest = g.reduce((best, p) => (p.joins > (best?.joins ?? -1) ? p : best), g[0])
  const avg = g.length ? joined / g.length : 0
  const [showTable, setShowTable] = useState(false)

  const growthPoints: ChartPoint[] = g.map((p) => ({ key: p.day, label: short(p.day), value: p.total, extra: [{ label: 'Joined', value: String(p.joins) }] }))
  const joinPoints: ChartPoint[] = g.map((p) => ({ key: p.day, label: short(p.day), value: p.joins }))
  const activePoints: ChartPoint[] = (active.data ?? []).map((p) => ({ key: p.day, label: short(p.day), value: p.active }))

  const monthDelta = o ? o.members_new_30d - o.members_prev_30d : 0

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Overview</h1>
      <p className="mt-1 text-text-secondary">{new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>

      {ov.error ? (
        <ErrorState className="mt-6" message={ov.error} onRetry={ov.reload} />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="Members" value={o ? o.members_total : '–'} hint={o ? `+${o.members_new_30d} this month · ${o.members_onboarded} onboarded` : ' '} to="/admin/members" />
          <StatCard
            label="Online now"
            value={
              o ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" />
                  {o.online_now}
                </span>
              ) : (
                '–'
              )
            }
            hint="active in the last 3 minutes"
            to="/admin/activity"
          />
          <StatCard label="Active today" value={o ? o.dau : '–'} hint={o ? `${o.wau} this week · ${o.mau} this month` : ' '} />
          <StatCard label="Projects" value={o ? o.projects_community : '–'} hint={o ? `${o.projects_new_7d} new this week · ${o.projects_github} open source` : ' '} to="/admin/projects" />
          <StatCard
            label="Funding to review"
            value={o ? o.funding_pending : '–'}
            accent={!!o?.funding_pending}
            hint={o ? `${formatMoney(o.funding_requested)} requested` : ' '}
            to="/admin/funding"
          />
          <StatCard label="Admins" value={o ? o.admins : '–'} hint="manage who can see this" to="/admin/admins" />
        </div>
      )}

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold text-text-primary">Member growth</h2>
          <Tabs<Range> value={range} onChange={setRange} tabs={RANGES} className="w-auto" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          {growth.loading && !growth.data ? (
            <Skeleton className="h-72" />
          ) : growth.error ? (
            <ErrorState message={growth.error} onRetry={growth.reload} />
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-4xl font-bold tracking-tight text-text-primary">{totalNow}</span>
                <span className="text-text-secondary">members</span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-text-secondary">
                +{joined} joined {range === 'all' ? 'in total' : `in the last ${RANGES.find((r) => r.value === range)?.label}`}
                {range === '30' && o && (
                  <span className={monthDelta >= 0 ? 'inline-flex items-center gap-1 text-success' : 'inline-flex items-center gap-1 text-danger'}>
                    {monthDelta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {monthDelta >= 0 ? 'up' : 'down'} from {o.members_prev_30d} the 30 days before
                  </span>
                )}
              </p>
              <div className="mt-4">
                <AreaLineChart points={growthPoints} ariaLabel="Total members over time" />
              </div>
              <p className="mt-2 text-xs text-text-muted">New members per day</p>
              <ColumnChart points={joinPoints} unit="joined" ariaLabel="New members per day" height={90} />
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
                <div>
                  <p className="text-text-muted">Busiest day</p>
                  <p className="font-semibold text-text-primary">{busiest ? `${short(busiest.day)} · ${busiest.joins}` : '–'}</p>
                </div>
                <div>
                  <p className="text-text-muted">Average</p>
                  <p className="font-semibold text-text-primary">{avg.toFixed(avg < 10 ? 1 : 0)} a day</p>
                </div>
                <div>
                  <p className="text-text-muted">Onboarded</p>
                  <p className="font-semibold text-text-primary">{o ? `${Math.round((o.members_onboarded / Math.max(o.members_total, 1)) * 100)}%` : '–'}</p>
                </div>
              </div>
              <button onClick={() => setShowTable((s) => !s)} className="mt-4 text-sm text-text-secondary hover:text-text-primary">
                {showTable ? '▾ Hide table' : '▸ Show as a table'}
              </button>
              {showTable && (
                <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-surface-2 text-left text-text-secondary">
                      <tr>
                        <th className="px-3 py-2 font-medium">Day</th>
                        <th className="px-3 py-2 text-right font-medium">Joined</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...g].reverse().map((p) => (
                        <tr key={p.day}>
                          <td className="px-3 py-2 text-text-primary">{short(p.day)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-primary">{p.joins}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-primary">{p.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[17px] font-semibold text-text-primary">Daily active users · last 30 days</h2>
        <div className="rounded-2xl border border-border bg-surface p-5 pt-6">
          {active.loading && !active.data ? <Skeleton className="h-36" /> : <ColumnChart points={activePoints} unit="active" ariaLabel="Daily active users" height={150} />}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[17px] font-semibold text-text-primary">Engagement · last 7 days</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Roadmap steps shipped" value={o ? o.steps_done_7d : '–'} />
          <StatCard label="Community posts" value={o ? o.posts_7d : '–'} />
          <StatCard label="Direct messages" value={o ? o.dms_7d : '–'} />
          <StatCard label="Avg. project progress" value={o ? `${o.avg_progress}%` : '–'} hint={o ? `${o.projects_completed} projects at 100%` : ' '} />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-text-primary">Latest activity</h2>
          <Link to="/admin/activity" className="text-sm font-medium text-accent hover:underline">
            See all
          </Link>
        </div>
        <ActivityFeed events={recent.data} loading={recent.loading} error={recent.error} onRetry={recent.reload} />
      </section>
    </div>
  )
}
