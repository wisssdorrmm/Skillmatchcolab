import type { ReactNode } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { AVAILABILITY, EXPERIENCE, INTERESTS, REFERRALS, labelFor, type Option } from '../../lib/constants'
import { getInsights, type Breakdown } from '../../services/admin.service'
import { Card } from '../../components/ui/Card'
import { ErrorState, Skeleton } from '../../components/ui/States'
import { BarList } from '../../components/admin/Charts'

const relabel = (rows: Breakdown[], options?: Option[]) =>
  rows.map((r) => ({ label: r.label === 'Not set' || !options ? r.label : labelFor(options, r.label), count: r.count }))

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-text-primary">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  )
}

export default function AdminInsights() {
  const { data, loading, error, reload } = useAsync(getInsights, [])

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Insights</h1>
      <p className="mt-1 text-text-secondary">What members told us during onboarding, and what they build.</p>
      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : error ? (
        <ErrorState className="mt-6" message={error} onRetry={reload} />
      ) : data ? (
        <>
          <p className="mt-4 text-sm text-text-secondary">
            {data.onboarded} of {data.total} members finished onboarding ({Math.round((data.onboarded / Math.max(data.total, 1)) * 100)}%).
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Panel title="Roles" subtitle="What people do">
              <BarList rows={data.roles} total={data.total} />
            </Panel>
            <Panel title="Here to…" subtitle="People could pick more than one">
              <BarList rows={relabel(data.interests, INTERESTS)} total={data.onboarded} />
            </Panel>
            <Panel title="Experience">
              <BarList rows={relabel(data.experience, EXPERIENCE)} total={data.total} />
            </Panel>
            <Panel title="Time for side projects">
              <BarList rows={relabel(data.availability, AVAILABILITY)} total={data.total} />
            </Panel>
            <Panel title="Countries">
              <BarList rows={data.countries} total={data.total} max={10} />
            </Panel>
            <Panel title="How they heard about us">
              <BarList rows={relabel(data.referral, REFERRALS)} total={data.total} />
            </Panel>
            <Panel title="Top skills">
              <BarList rows={data.skills} total={data.onboarded} max={12} />
            </Panel>
            <Panel title="Project categories" subtitle="Community projects only">
              <BarList rows={data.categories} total={data.categories.reduce((n, r) => n + r.count, 0)} />
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  )
}
