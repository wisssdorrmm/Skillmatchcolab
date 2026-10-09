import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, Inbox, MessageCircle, X } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { errorMessage } from '../lib/errors'
import { timeAgo } from '../lib/format'
import { acceptApplication, listApplicationsForProject, rejectApplication } from '../services/applications.service'
import { getProject } from '../services/projects.service'
import type { Application } from '../types/database'
import { PageHeader } from '../components/ui/PageHeader'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { StatCard } from '../components/ui/Card'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'

interface ApplicationRow extends Application {
  applicant: { id: string; name: string | null; avatar_url: string | null; primary_role: string | null; bio: string | null } | null
}

export default function ManageApplications() {
  const { id = '' } = useParams()
  const toast = useToast()
  const project = useAsync(() => getProject(id), [id])
  const apps = useAsync(() => listApplicationsForProject(id) as Promise<ApplicationRow[]>, [id])
  const [busy, setBusy] = useState<string | null>(null)

  const decide = async (app: ApplicationRow, accept: boolean) => {
    setBusy(app.id)
    try {
      if (accept) await acceptApplication(app)
      else await rejectApplication(app.id)
      apps.setData((list) => list?.map((a) => (a.id === app.id ? { ...a, status: accept ? 'accepted' : 'rejected' } : a)) ?? null)
      toast(accept ? `${app.applicant?.name ?? 'They'} joined the team` : 'Application declined')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(null)
    }
  }

  const list = apps.data ?? []
  const pending = list.filter((a) => a.status === 'pending')
  const decided = list.filter((a) => a.status !== 'pending')

  const renderRow = (app: ApplicationRow) => (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Link to={`/u/${app.applicant_id}`}>
          <Avatar name={app.applicant?.name} src={app.applicant?.avatar_url} size="md" seed={app.applicant_id} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link to={`/u/${app.applicant_id}`} className="truncate font-semibold text-text-primary hover:text-accent">
              {app.applicant?.name ?? 'Applicant'}
            </Link>
            {app.status === 'pending' ? (
              <span className="shrink-0 text-xs text-text-muted">{timeAgo(app.created_at)}</span>
            ) : (
              <Badge tone={app.status === 'accepted' ? 'success' : 'danger'}>{app.status === 'accepted' ? 'Accepted' : 'Declined'}</Badge>
            )}
          </div>
          <p className="truncate text-[13px] text-text-secondary">{app.applicant?.primary_role ?? 'Builder'}</p>
        </div>
      </div>
      {app.message && <p className="mt-3 whitespace-pre-line rounded-xl bg-surface-2/60 p-3 text-sm text-text-primary">{app.message}</p>}
      <div className="mt-4 flex gap-2">
        {app.status === 'pending' && (
          <>
            <Button size="sm" className="flex-1" icon={<Check size={15} />} loading={busy === app.id} onClick={() => decide(app, true)}>
              Accept
            </Button>
            <Button size="sm" variant="secondary" className="flex-1" icon={<X size={15} />} disabled={busy === app.id} onClick={() => decide(app, false)}>
              Decline
            </Button>
          </>
        )}
        <ButtonLink
          to={`/project/${id}/messages/${app.applicant_id}`}
          size="sm"
          variant="outline"
          icon={<MessageCircle size={15} />}
          className={app.status === 'pending' ? '' : 'flex-1'}
        >
          Message
        </ButtonLink>
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader back title="Applicants" subtitle={project.data?.title} />

      <div className="grid grid-cols-3 gap-2.5">
        <StatCard label="Total" value={apps.data ? list.length : '–'} />
        <StatCard label="Pending" value={apps.data ? pending.length : '–'} accent={pending.length > 0} />
        <StatCard label="On the team" value={apps.data ? list.filter((a) => a.status === 'accepted').length : '–'} />
      </div>

      <div className="mt-6">
        {apps.loading ? (
          <ListSkeleton rows={3} />
        ) : apps.error ? (
          <ErrorState message={apps.error} onRetry={apps.reload} />
        ) : list.length === 0 ? (
          <EmptyState icon={<Inbox size={22} />} title="No applications yet" body="Share your project in the community to find teammates faster." action={<ButtonLink to="/community/find-a-team">Post in #find-a-team</ButtonLink>} />
        ) : (
          <div className="flex flex-col gap-6">
            {pending.length > 0 && (
              <section>
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-text-muted">Waiting for you</h2>
                <div className="flex flex-col gap-3">
                  {pending.map((a) => (
                    <div key={a.id}>{renderRow(a)}</div>
                  ))}
                </div>
              </section>
            )}
            {decided.length > 0 && (
              <section>
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-text-muted">Decided</h2>
                <div className="flex flex-col gap-3">
                  {decided.map((a) => (
                    <div key={a.id}>{renderRow(a)}</div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
