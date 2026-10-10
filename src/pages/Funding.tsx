import { useState } from 'react'
import { ArrowUpRight, FileText, HandCoins, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { errorMessage } from '../lib/errors'
import { formatDate, formatMoney } from '../lib/format'
import { FUNDING_STATUS, listFundingPrograms, listMyFundingApplications, withdrawFundingApplication } from '../services/funding.service'
import type { FundingApplication } from '../types/database'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Chip } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, Section } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/Modal'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { safeUrl } from '../lib/safeUrl'

export default function Funding() {
  const { user } = useAuth()
  const toast = useToast()
  const programs = useAsync(() => listFundingPrograms(), [])
  const mine = useAsync(() => listMyFundingApplications(user!.id), [user?.id])
  const [region, setRegion] = useState('')
  const [withdrawing, setWithdrawing] = useState<FundingApplication | null>(null)

  const internal = programs.data?.find((p) => p.is_internal)
  const external = (programs.data ?? []).filter((p) => !p.is_internal && (!region || p.region === region))
  const regions = [...new Set((programs.data ?? []).filter((p) => !p.is_internal).map((p) => p.region))]

  const withdraw = async () => {
    if (!withdrawing) return
    const target = withdrawing
    setWithdrawing(null)
    try {
      await withdrawFundingApplication(target.id)
      mine.setData((list) => list?.filter((a) => a.id !== target.id) ?? null)
      toast('Application withdrawn')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Funding" subtitle="Grants, cloud credits and investors for what you're building." />

      <div className="relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.14] via-accent/[0.04] to-transparent p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-ink">
          <HandCoins size={24} />
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-text-primary">{internal?.name ?? 'Apply for funding'}</h2>
        <p className="mt-2 max-w-lg text-[15px] text-text-secondary">
          {internal?.description ?? 'Tell us what you are building and what you need. We review every application and reply with next steps.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink to="/funding/apply" size="lg" icon={<FileText size={18} />}>
            Start an application
          </ButtonLink>
        </div>
        <p className="mt-3 text-xs text-text-muted">Takes about 5 minutes. You can track the status right here.</p>
      </div>

      <Section title="Your applications">
        {mine.loading ? (
          <ListSkeleton rows={1} />
        ) : mine.error ? (
          <ErrorState message={mine.error} onRetry={mine.reload} />
        ) : !mine.data?.length ? (
          <EmptyState icon={<Sparkles size={22} />} title="No applications yet" body="When you apply, you'll see its status and any notes from the reviewers here." />
        ) : (
          <div className="flex flex-col gap-3">
            {mine.data.map((a) => {
              const st = FUNDING_STATUS[a.status]
              return (
                <Card key={a.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text-primary">{a.project_name}</p>
                      <p className="text-sm text-text-secondary">
                        {formatMoney(a.amount_requested)} · {a.program?.name ?? 'Cobuild review'} · {formatDate(a.created_at)}
                      </p>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  {a.admin_note && <p className="mt-3 rounded-xl bg-surface-2/60 p-3 text-sm text-text-primary">“{a.admin_note}”</p>}
                  {a.status === 'submitted' && (
                    <Button variant="ghost" size="sm" className="mt-2 -ml-2 text-danger hover:text-danger" onClick={() => setWithdrawing(a)}>
                      Withdraw
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Programs worth applying to" subtitle="External programs open to builders. Always check the latest rules on their site.">
        {regions.length > 1 && (
          <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Chip active={!region} onClick={() => setRegion('')}>
              All regions
            </Chip>
            {regions.map((r) => (
              <Chip key={r} active={region === r} onClick={() => setRegion(region === r ? '' : r)}>
                {r}
              </Chip>
            ))}
          </div>
        )}
        {programs.loading ? (
          <ListSkeleton rows={3} />
        ) : programs.error ? (
          <ErrorState message={programs.error} onRetry={programs.reload} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {external.map((p) => (
              <a
                key={p.id}
                href={safeUrl(p.url)}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-secondary">{p.provider}</p>
                    <p className="mt-0.5 font-semibold text-text-primary group-hover:text-accent">{p.name}</p>
                  </div>
                  <ArrowUpRight size={18} className="shrink-0 text-text-muted group-hover:text-accent" />
                </div>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-text-secondary">{p.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.amount_text && <Badge tone="accent">{p.amount_text}</Badge>}
                  {p.region !== 'Global' && <Badge tone="info">{p.region}</Badge>}
                  {p.tags.slice(0, 2).map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              </a>
            ))}
          </div>
        )}
      </Section>

      <ConfirmDialog
        open={!!withdrawing}
        title="Withdraw this application?"
        body="You can apply again later."
        confirmLabel="Withdraw"
        danger
        onConfirm={withdraw}
        onClose={() => setWithdrawing(null)}
      />
    </div>
  )
}
