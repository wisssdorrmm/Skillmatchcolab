import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Bookmark,
  Check,
  ExternalLink,
  Flame,
  Globe,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  Users,
  UserPlus,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { useSaved } from '../hooks/useSaved'
import { cn } from '../lib/cn'
import { errorMessage } from '../lib/errors'
import { compactNumber, formatDate, timeAgo } from '../lib/format'
import { STAGES, STAGE_STYLES, labelFor } from '../lib/constants'
import {
  countUpvotes,
  deleteProject,
  getProject,
  contributeUrl,
  hasUpvoted,
  setMilestoneDone,
  setUpvote,
  subscribeToMilestones,
  type ProjectDetail,
} from '../services/projects.service'
import { applyToProject, getMyApplication, listApplicationsForProject, withdrawApplication } from '../services/applications.service'
import { startConversation } from '../services/conversations.service'
import type { Application, Milestone } from '../types/database'
import { PageHeader } from '../components/ui/PageHeader'
import { Avatar } from '../components/ui/Avatar'
import { Badge, Tag } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { Textarea } from '../components/ui/Field'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { GithubIcon } from '../components/ui/GithubIcon'
import { ProjectIcon } from '../components/project/ProjectCard'

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-text-muted">{children}</h2>
}

export default function ProjectDetails() {
  const { id = '' } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { saved, toggle: toggleSave } = useSaved()

  const { data: project, loading, error, reload, refresh, setData } = useAsync(() => getProject(id), [id])
  const [hyped, setHyped] = useState(false)
  const [hypes, setHypes] = useState(0)
  const [myApp, setMyApp] = useState<Application | null>(null)
  const [pending, setPending] = useState(0)
  const [busyStep, setBusyStep] = useState<string | null>(null)
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')
  const [applying, setApplying] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const uid = user?.id ?? ''
  const isOwner = !!project && project.owner_id === uid
  const isMember = !!project?.project_members.some((m) => m.user_id === uid)
  const canTick = isOwner || isMember || isAdmin
  const isGithub = project?.source === 'github'
  // Found outside the app (GitHub repo or another site): no roadmap/team/apply here.
  const imported = !!project && project.source !== 'community'

  useEffect(() => {
    if (!id || !uid) return
    hasUpvoted(id, uid).then(setHyped).catch(() => {})
    countUpvotes(id).then(setHypes).catch(() => {})
    getMyApplication(id, uid).then(setMyApp).catch(() => {})
  }, [id, uid])

  useEffect(() => {
    if (isOwner) listApplicationsForProject(id).then((apps) => setPending(apps.filter((a) => a.status === 'pending').length)).catch(() => {})
  }, [id, isOwner])

  // Live progress: teammates ticking steps update this page instantly.
  useEffect(() => {
    if (!id) return
    const ch = subscribeToMilestones(id, () => refresh())
    return () => {
      supabase.removeChannel(ch)
    }
  }, [id, refresh])

  if (loading) return <ListSkeleton rows={4} />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        body="It may have been deleted."
        action={<ButtonLink to="/explore">Explore projects</ButtonLink>}
      />
    )
  }

  const steps = project.project_milestones ?? []
  const doneCount = steps.filter((s) => s.is_done).length

  const toggleStep = async (m: Milestone) => {
    if (!canTick || busyStep) return
    const next = !m.is_done
    setBusyStep(m.id)
    const optimistic = (p: ProjectDetail | null): ProjectDetail | null =>
      p && {
        ...p,
        progress: Math.max(0, Math.min(100, p.progress + (next ? m.weight : -m.weight))),
        project_milestones: p.project_milestones.map((s) =>
          s.id === m.id ? { ...s, is_done: next, done_at: next ? new Date().toISOString() : null, done_by: next ? uid : null } : s,
        ),
      }
    setData(optimistic)
    try {
      const progress = await setMilestoneDone(m.id, next)
      setData((p) => p && { ...p, progress })
      if (next) toast(progress >= 100 ? `🎉 ${project.title} hit 100%!` : `Step done — +${m.weight}% · +${m.weight} XP`)
    } catch (err) {
      toast(errorMessage(err), 'error')
      refresh()
    } finally {
      setBusyStep(null)
    }
  }

  const toggleHype = async () => {
    const next = !hyped
    setHyped(next)
    setHypes((n) => n + (next ? 1 : -1))
    try {
      await setUpvote(project.id, uid, next)
    } catch (err) {
      setHyped(!next)
      setHypes((n) => n + (next ? -1 : 1))
      toast(errorMessage(err), 'error')
    }
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: project.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast('Link copied')
      }
    } catch {
      /* user cancelled share */
    }
  }

  const apply = async () => {
    setApplying(true)
    try {
      await applyToProject(project.id, uid, applyMsg.trim())
      setMyApp(await getMyApplication(project.id, uid))
      setApplyOpen(false)
      setApplyMsg('')
      toast('Application sent — the owner has been notified')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setApplying(false)
    }
  }

  const withdraw = async () => {
    if (!myApp) return
    try {
      await withdrawApplication(myApp.id)
      setMyApp(null)
      toast('Application withdrawn')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const messageOwner = async () => {
    if (!project.owner) return
    try {
      const conv = await startConversation(project.owner.id)
      navigate(`/messages/${conv}`)
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const remove = async () => {
    setDeleting(true)
    try {
      await deleteProject(project.id)
      toast('Project deleted')
      navigate('/my-projects', { replace: true })
    } catch (err) {
      toast(errorMessage(err), 'error')
      setDeleting(false)
    }
  }

  const memberRows = project.project_members.filter((m) => m.profile)

  return (
    <div>
      <PageHeader
        back
        className="mb-2"
        actions={
          (isOwner || isAdmin) && !imported ? (
            <div className="relative">
              <Button variant="ghost" size="sm" aria-label="Project options" onClick={() => setMenuOpen((o) => !o)}>
                <MoreHorizontal size={18} />
              </Button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="animate-pop absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-surface-2 py-1 shadow-xl">
                    <Link to={`/project/${project.id}/edit`} className="flex items-center gap-2 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-hover">
                      <Pencil size={15} /> Edit project
                    </Link>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        setConfirmDelete(true)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-danger hover:bg-surface-hover"
                    >
                      <Trash2 size={15} /> Delete project
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Header */}
      <div className="flex gap-4">
        <ProjectIcon project={project} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary sm:text-3xl">{project.title}</h1>
          {project.tagline && <p className="mt-1 text-[15px] text-text-secondary">{project.tagline}</p>}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {isGithub ? (
              <Badge tone="success">Open source</Badge>
            ) : imported ? (
              <Badge tone="info">Open call</Badge>
            ) : (
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', STAGE_STYLES[project.stage])}>{labelFor(STAGES, project.stage)}</span>
            )}
            {project.category && <Badge>{project.category}</Badge>}
            {!imported && (project.status === 'closed' ? <Badge>Team full</Badge> : <Badge tone="accent">Looking for teammates</Badge>)}
          </div>
        </div>
      </div>

      {/* Owner line */}
      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        {isGithub ? (
          <a href={`https://github.com/${project.external_owner}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3">
            <GithubIcon size={20} className="shrink-0 text-text-secondary" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-text-primary">{project.external_owner}</span>
              <span className="block text-xs text-text-secondary">
                Maintained on GitHub{project.external_source && project.external_source !== 'GitHub' ? ` · request via ${project.external_source}` : ''}
              </span>
            </span>
          </a>
        ) : imported ? (
          <a href={contributeUrl(project)} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3">
            <Globe size={20} className="shrink-0 text-text-secondary" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-text-primary">{project.external_owner ?? project.title}</span>
              <span className="block text-xs text-text-secondary">Posted on {project.external_source ?? 'the web'}</span>
            </span>
          </a>
        ) : (
          <Link to={project.owner ? `/u/${project.owner.id}` : '#'} className="flex min-w-0 items-center gap-3">
            <Avatar name={project.owner?.name} src={project.owner?.avatar_url} size="md" lastSeen={project.owner?.show_online ? project.owner.last_seen_at : null} showStatus seed={project.owner?.id} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-text-primary">{project.owner?.name ?? 'A builder'}</span>
              <span className="block truncate text-xs text-text-secondary">
                {project.owner?.primary_role ?? 'Owner'} · posted {formatDate(project.created_at)}
              </span>
            </span>
          </Link>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={toggleHype}
            aria-pressed={hyped}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors',
              hyped ? 'bg-warning/15 text-warning' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
            )}
          >
            <Flame size={17} className={hyped ? 'fill-warning' : ''} /> {hypes}
          </button>
          <button
            onClick={() => toggleSave(project.id)}
            aria-label={saved.has(project.id) ? 'Remove from saved' : 'Save project'}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          >
            <Bookmark size={18} className={saved.has(project.id) ? 'fill-accent text-accent' : ''} />
          </button>
          <button onClick={share} aria-label="Share" className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-2 hover:text-text-primary">
            <Link2 size={18} />
          </button>
        </div>
      </div>

      {/* Main CTA */}
      <div className="mt-4">
        {imported ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={contributeUrl(project)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-ink hover:bg-accent-hover"
            >
              {isGithub ? <GithubIcon size={18} /> : <ExternalLink size={18} />}
              {!isGithub ? 'See the request' : project.external_contribute_url ? 'See open tasks' : 'Find a first issue'}
            </a>
            {isGithub ? (
              <a
                href={project.external_url ?? project.repo_url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong px-5 text-[15px] font-semibold text-text-primary hover:bg-surface-2"
              >
                <Star size={16} className="text-gold" /> {compactNumber(project.external_stars)} stars · View repo
              </a>
            ) : project.demo_url ? (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong px-5 text-[15px] font-semibold text-text-primary hover:bg-surface-2"
              >
                <Globe size={16} /> Visit website
              </a>
            ) : null}
          </div>
        ) : isOwner ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <ButtonLink to={`/project/${project.id}/applications`} size="lg" className="flex-1" icon={<UserPlus size={18} />}>
              Applicants{pending > 0 ? ` (${pending} new)` : ''}
            </ButtonLink>
            <ButtonLink to={`/chats/${project.id}`} size="lg" variant="secondary" className="flex-1" icon={<MessageCircle size={18} />}>
              Team chat
            </ButtonLink>
          </div>
        ) : isMember ? (
          <ButtonLink to={`/chats/${project.id}`} size="lg" fullWidth icon={<MessageCircle size={18} />}>
            Open team chat
          </ButtonLink>
        ) : myApp ? (
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="text-sm text-text-secondary">Your application</p>
              <p className="font-semibold capitalize text-text-primary">
                {myApp.status === 'pending' ? 'Waiting for the owner' : myApp.status === 'accepted' ? 'Accepted 🎉' : 'Not accepted this time'}
              </p>
            </div>
            <div className="flex gap-2">
              <ButtonLink to={`/project/${project.id}/messages/${uid}`} variant="secondary" size="sm" icon={<MessageCircle size={15} />}>
                Message owner
              </ButtonLink>
              {myApp.status === 'pending' && (
                <Button variant="danger" size="sm" onClick={withdraw}>
                  Withdraw
                </Button>
              )}
            </div>
          </Card>
        ) : project.status === 'closed' ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex h-12 flex-1 items-center justify-center rounded-xl border border-border text-sm text-text-secondary">This team is full right now</div>
            <Button size="lg" variant="secondary" className="flex-1" icon={<MessageCircle size={18} />} onClick={messageOwner}>
              Message owner
            </Button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button size="lg" className="flex-1" icon={<UserPlus size={18} />} onClick={() => setApplyOpen(true)}>
              Apply to join
            </Button>
            <Button size="lg" variant="secondary" className="flex-1" icon={<MessageCircle size={18} />} onClick={messageOwner}>
              Message owner
            </Button>
          </div>
        )}
      </div>

      {/* Progress + roadmap */}
      {!imported && (
        <Card className="mt-6 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wider text-text-muted">Progress</p>
              <p className={cn('mt-1 text-4xl font-bold tabular-nums tracking-tight', project.progress >= 100 ? 'text-success' : 'text-text-primary')}>
                {project.progress}%
              </p>
            </div>
            <p className="pb-1 text-right text-sm text-text-secondary">
              {doneCount} of {steps.length} steps done
              <br />
              <span className="text-xs text-text-muted">updated {timeAgo(project.updated_at)}</span>
            </p>
          </div>
          <ProgressBar value={project.progress} size="lg" className="mt-4" label="Project progress" />

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle>Roadmap</SectionTitle>
              {canTick && steps.length > 0 && <p className="-mt-3 text-xs text-text-muted">Tap a step when it's done</p>}
            </div>
            {steps.length === 0 ? (
              <p className="text-sm text-text-secondary">No roadmap yet.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {steps.map((m, i) => {
                  const doer = m.done_by ? project.project_members.find((pm) => pm.user_id === m.done_by)?.profile : null
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={!canTick || busyStep === m.id}
                        onClick={() => toggleStep(m)}
                        aria-pressed={m.is_done}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                          m.is_done ? 'border-success/25 bg-success/[0.06]' : 'border-border bg-surface-2/40',
                          canTick ? 'hover:border-border-strong' : 'cursor-default',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                            m.is_done ? 'border-success bg-success text-bg' : 'border-border-strong text-text-muted',
                          )}
                        >
                          {m.is_done ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block text-[15px] font-medium', m.is_done ? 'text-text-secondary line-through decoration-text-muted' : 'text-text-primary')}>
                            {m.title}
                          </span>
                          {m.is_done && m.done_at && (
                            <span className="block text-xs text-text-muted">
                              Done {timeAgo(m.done_at)}
                              {doer?.name ? ` by ${doer.name}` : ''}
                            </span>
                          )}
                        </span>
                        <span className={cn('shrink-0 rounded-full px-2 py-1 text-[11px] font-bold tabular-nums', m.is_done ? 'bg-success/15 text-success' : 'bg-surface-hover text-text-secondary')}>
                          {m.weight}%
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </Card>
      )}

      {/* About */}
      <Card className="mt-4 p-5 sm:p-6">
        <SectionTitle>About</SectionTitle>
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-text-primary">{project.description}</p>
        {project.tech_stack?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.tech_stack.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
        {(!imported || isGithub) && (project.demo_url || (project.repo_url && !imported)) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {project.demo_url && (
              <a href={project.demo_url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-medium text-text-primary hover:bg-surface-2">
                <ExternalLink size={15} /> Live demo
              </a>
            )}
            {project.repo_url && !imported && (
              <a href={project.repo_url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-medium text-text-primary hover:bg-surface-2">
                <GithubIcon size={15} /> Code
              </a>
            )}
          </div>
        )}
      </Card>

      {project.project_roles_needed.length > 0 && (
        <Card className="mt-4 p-5 sm:p-6">
          <SectionTitle>{imported ? 'They need help from' : 'Looking for'}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {project.project_roles_needed.map((r) => (
              <span key={r.id} className="rounded-full bg-accent/10 px-3 py-1.5 text-[13px] font-medium text-accent">
                {r.role_name}
              </span>
            ))}
          </div>
        </Card>
      )}

      {!imported && (
        <Card className="mt-4 p-5 sm:p-6">
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} /> Team · {memberRows.length}
            </span>
          </SectionTitle>
          <div className="flex flex-col gap-1">
            {memberRows.map((m) => (
              <Link key={m.user_id} to={`/u/${m.user_id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                <Avatar name={m.profile?.name} src={m.profile?.avatar_url} size="md" lastSeen={m.profile?.show_online ? m.profile.last_seen_at : null} showStatus seed={m.user_id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">{m.profile?.name}</span>
                  <span className="block truncate text-xs text-text-secondary">{m.profile?.primary_role ?? 'Builder'}</span>
                </span>
                <span className="text-xs text-text-muted">{m.role ?? 'Member'}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title={`Apply to ${project.title}`}
        footer={
          <Button fullWidth size="lg" loading={applying} onClick={apply}>
            Send application
          </Button>
        }
      >
        <p className="mb-3 text-sm text-text-secondary">Tell the owner what you'd bring. Mention your skills and how much time you have.</p>
        <Textarea rows={5} maxLength={1000} value={applyMsg} onChange={(e) => setApplyMsg(e.target.value)} placeholder="Hi! I'm a frontend dev with 2 years of React…" autoFocus />
        {project.project_roles_needed.length > 0 && (
          <p className="mt-3 text-xs text-text-muted">They need: {project.project_roles_needed.map((r) => r.role_name).join(', ')}</p>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        danger
        loading={deleting}
        title="Delete this project?"
        body="This removes the roadmap, team, applications and team chat for good."
        confirmLabel="Delete"
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
