import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getProjectById } from '../services/projects.service'
import { applyToProject, getMyApplication, withdrawApplication } from '../services/applications.service'
import type { Application } from '../types/database'

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState<any>(null)
  const [myApplication, setMyApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [applying, setApplying] = useState(false)
  const [applyMessage, setApplyMessage] = useState('')
  const [showApplyForm, setShowApplyForm] = useState(false)

  const load = async () => {
    if (!id || !user) return
    setLoading(true)
    try {
      const [p, app] = await Promise.all([getProjectById(id), getMyApplication(id, user.id)])
      setProject(p)
      setMyApplication(app)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  if (loading) return <p className="p-6 text-center text-sm text-text-muted">Loading…</p>
  if (error) return <p className="p-6 text-center text-sm text-danger">{error}</p>
  if (!project) return <p className="p-6 text-center text-sm text-text-secondary">Project not found.</p>

  const isOwner = user?.id === project.owner_id
  const isMember = project.project_members?.some((m: any) => m.user_id === user?.id)

  const handleApply = async () => {
    if (!id || !user) return
    setApplying(true)
    try {
      await applyToProject(id, user.id, applyMessage.trim())
      await load()
      setShowApplyForm(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setApplying(false)
    }
  }

  const handleWithdraw = async () => {
    if (!myApplication) return
    setApplying(true)
    try {
      await withdrawApplication(myApplication.id)
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-6 pb-24">
      <div className="mb-5 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        {isOwner && (
          <button
            onClick={() => navigate(`/project/${id}/applications`)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
          >
            <Users size={14} /> Manage Applicants
          </button>
        )}
      </div>

      <span className="mb-2 inline-block rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium capitalize text-accent">
        {project.status?.replace('_', ' ')}
      </span>
      <h1 className="mb-1 text-xl font-semibold text-text-primary">{project.title}</h1>
      <p className="mb-4 text-xs text-text-muted">
        Posted by {project.owner?.name ?? 'Unknown'}
        {project.owner?.primary_role ? ` · ${project.owner.primary_role}` : ''}
      </p>

      <div className="mb-5">
        <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
          About the Project
        </h2>
        <p className="whitespace-pre-line text-sm text-text-secondary">{project.description}</p>
      </div>

      {project.project_roles_needed?.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
            Looking For
          </h2>
          <div className="flex flex-wrap gap-2">
            {project.project_roles_needed.map((role: any) => (
              <span key={role.id} className="rounded-full bg-surface px-3 py-1 text-xs text-text-secondary">
                {role.role_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {project.project_members?.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
            Current Team ({project.project_members.length})
          </h2>
          <div className="flex flex-col gap-2">
            {project.project_members.map((m: any) => (
              <div key={m.user_id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                <span className="text-sm text-text-primary">{m.profiles?.name ?? 'Member'}</span>
                <span className="text-xs text-text-muted">{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {!isOwner && !isMember && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg p-4">
          <div className="mx-auto max-w-md">
            {myApplication ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm capitalize text-text-secondary">
                  Application status: <span className="font-medium text-text-primary">{myApplication.status}</span>
                </span>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => navigate(`/project/${id}/messages/${user?.id}`)}
                    className="text-sm text-accent hover:underline"
                  >
                    Message
                  </button>
                  {myApplication.status === 'pending' && (
                    <button
                      onClick={handleWithdraw}
                      disabled={applying}
                      className="text-sm text-danger hover:underline disabled:opacity-50"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            ) : showApplyForm ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="Why are you a good fit? (optional)"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                />
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="rounded-lg bg-accent py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {applying ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowApplyForm(true)}
                className="w-full rounded-lg bg-accent py-3 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Apply to Join Team
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
