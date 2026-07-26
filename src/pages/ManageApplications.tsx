import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  listApplicationsForProject,
  acceptApplication,
  rejectApplication,
} from '../services/applications.service'

export default function ManageApplications() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const apps = await listApplicationsForProject(id)
      setApplications(apps)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleAccept = async (app: any) => {
    setActingOn(app.id)
    try {
      await acceptApplication(app)
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActingOn(null)
    }
  }

  const handleReject = async (app: any) => {
    setActingOn(app.id)
    try {
      await rejectApplication(app.id)
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActingOn(null)
    }
  }

  const pending = applications.filter((a) => a.status === 'pending')
  const decided = applications.filter((a) => a.status !== 'pending')

  const total = applications.length
  const acceptedCount = applications.filter((a) => a.status === 'accepted').length

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Manage Applications</h1>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Total Applicants" value={total} />
        <Stat label="Pending" value={pending.length} />
        <Stat label="Accepted" value={acceptedCount} />
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="py-10 text-center text-sm text-text-muted">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-secondary">No applications yet.</p>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                Pending Review
              </h2>
              <div className="mb-6 flex flex-col gap-3">
                {pending.map((app) => (
                  <ApplicantCard
                    key={app.id}
                    app={app}
                    busy={actingOn === app.id}
                    onAccept={() => handleAccept(app)}
                    onReject={() => handleReject(app)}
                  />
                ))}
              </div>
            </>
          )}

          {decided.length > 0 && (
            <>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Decided</h2>
              <div className="flex flex-col gap-3">
                {decided.map((app) => (
                  <ApplicantCard key={app.id} app={app} busy={false} readOnly />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface p-3 text-center">
      <p className="text-lg font-semibold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-muted">{label}</p>
    </div>
  )
}

function ApplicantCard({
  app,
  busy,
  readOnly,
  onAccept,
  onReject,
}: {
  app: any
  busy: boolean
  readOnly?: boolean
  onAccept?: () => void
  onReject?: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-medium text-text-primary">{app.applicant?.name ?? 'Applicant'}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${
            app.status === 'accepted'
              ? 'bg-success/15 text-success'
              : app.status === 'rejected'
              ? 'bg-danger/15 text-danger'
              : 'bg-warning/15 text-warning'
          }`}
        >
          {app.status}
        </span>
      </div>
      {app.applicant?.primary_role && (
        <p className="mb-2 text-xs text-text-muted">{app.applicant.primary_role}</p>
      )}
      {app.message && <p className="mb-3 text-sm text-text-secondary">{app.message}</p>}

      {!readOnly && (
        <div className="flex gap-2">
          <button
            onClick={onReject}
            disabled={busy}
            className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-text-secondary hover:border-danger hover:text-danger disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            disabled={busy}
            className="flex-1 rounded-lg bg-accent py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      )}
    </div>
  )
}
