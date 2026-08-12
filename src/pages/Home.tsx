import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, SlidersHorizontal, Bookmark, FileText, Users } from 'lucide-react'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../context/AuthContext'
import { listProjects } from '../services/projects.service'
import { getSkillsForUser } from '../services/profiles.service'
import { rankProjects, type RankedProject } from '../services/matching.service'
import { getMyActivity, type ActivityItem } from '../services/activity.service'
import { getSavedProjectIds, saveProject, unsaveProject } from '../services/saved.service'
import { getProjectVisual } from '../utils/projectVisual'
import { timeAgo } from '../utils/timeAgo'

const RECOMMENDED_LIMIT = 3
const ACTIVITY_PREVIEW_LIMIT = 3

export default function Home() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [ranked, setRanked] = useState<RankedProject[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [showAllActivity, setShowAllActivity] = useState(false)

  // Always re-fetches fresh from Supabase — no local caching of the project list.
  const loadHomeData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [projects, mySkills, myActivity] = await Promise.all([
        listProjects(search),
        getSkillsForUser(user.id),
        getMyActivity(user.id, 20),
      ])
      const skillNames = mySkills.map((s) => s.name)
      setRanked(rankProjects(projects, profile?.primary_role, skillNames))
      setActivity(myActivity)
    } catch (err: any) {
      setError(err.message ?? 'Could not load your feed.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.primary_role, search])

  useEffect(() => {
    if (!user) return
    getSavedProjectIds(user.id).then(setSaved).catch(() => {})
  }, [user])

  useEffect(() => {
    const handle = setTimeout(loadHomeData, 250)
    return () => clearTimeout(handle)
  }, [loadHomeData])

  // Re-fetch whenever the tab regains focus, so newly created projects always show up.
  useEffect(() => {
    const onFocus = () => loadHomeData()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadHomeData])

  const toggleSaved = (id: string) => {
    if (!user) return
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        unsaveProject(user.id, id).catch(() => {})
      } else {
        next.add(id)
        saveProject(user.id, id).catch(() => {})
      }
      return next
    })
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const recommended = ranked.slice(0, RECOMMENDED_LIMIT)
  const visibleActivity = showAllActivity ? activity : activity.slice(0, ACTIVITY_PREVIEW_LIMIT)

  return (
    <div className="mx-auto max-w-md pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pb-1 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
            <div className="h-4 w-4 rounded-full border-2 border-accent" />
          </div>
          <span className="text-lg font-bold tracking-tight text-text-primary">SkillMatch</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            onClick={() => navigate('/profile')}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-white"
            aria-label="Profile"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile?.name ?? 'U')
                .split(' ')
                .map((p) => p.charAt(0))
                .join('')
                .slice(0, 2)
                .toUpperCase()
            )}
          </button>
        </div>
      </div>

      <div className="px-6">
        {/* Greeting */}
        <div className="mb-5 mt-3">
          <h1 className="text-2xl font-bold text-text-primary">
            {greeting}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Find projects that match what you do.</p>
        </div>

        {/* Create project */}
        <button
          onClick={() => navigate('/create-project')}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          <Plus size={18} strokeWidth={2.5} /> Create Project
        </button>

        {/* Search + filter */}
        <div className="mb-6 flex gap-2.5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, roles, or skills..."
              className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <button
            onClick={() => navigate('/explore')}
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary"
            aria-label="Filters"
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        {/* Recommended for you */}
        <div className="mb-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-text-primary">Recommended for You</h2>
            <button
              onClick={() => navigate('/explore')}
              className="text-[13px] font-medium text-accent hover:underline"
            >
              See all
            </button>
          </div>

          {loading ? (
            <p className="py-6 text-center text-sm text-text-muted">Loading…</p>
          ) : recommended.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-5 text-center">
              <p className="text-sm text-text-secondary">No projects match yet.</p>
              <button onClick={() => navigate('/explore')} className="mt-1.5 text-sm text-accent hover:underline">
                Browse all projects
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {recommended.map((project) => {
                const visual = getProjectVisual(project.id)
                const Icon = visual.icon
                const isSaved = saved.has(project.id)
                return (
                  <div key={project.id} className="rounded-2xl border border-border bg-surface p-5">
                    <div className="mb-3.5 flex items-start gap-3.5">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: visual.bg }}
                      >
                        <Icon size={21} style={{ color: visual.fg }} />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-semibold leading-snug text-text-primary">{project.title}</h3>
                          <button
                            onClick={() => toggleSaved(project.id)}
                            className="shrink-0 text-text-muted hover:text-accent"
                            aria-label="Save project"
                          >
                            <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} className={isSaved ? 'text-accent' : ''} />
                          </button>
                        </div>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {project.owner?.name ? `${project.owner.name} · ` : ''}
                          {timeAgo(project.created_at)}
                        </p>
                      </div>
                    </div>

                    <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
                      {project.description}
                    </p>

                    {project.project_roles_needed.length > 0 && (
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        {project.project_roles_needed.slice(0, 2).map((role) => (
                          <span
                            key={role.id}
                            className="rounded-full border border-accent/30 px-2.5 py-1 text-[11px] font-medium text-accent"
                          >
                            {role.role_name}
                          </span>
                        ))}
                        <span className="ml-auto text-[11px] font-medium text-success">
                          {project.project_roles_needed.length} open
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => navigate(`/project/${project.id}`)}
                      className="w-full rounded-xl border border-accent/40 py-2.5 text-sm font-medium text-accent hover:bg-accent/10"
                    >
                      Open Project
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Your Activity */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-text-primary">Your Activity</h2>
            {activity.length > ACTIVITY_PREVIEW_LIMIT && (
              <button
                onClick={() => setShowAllActivity((v) => !v)}
                className="text-[13px] font-medium text-accent hover:underline"
              >
                {showAllActivity ? 'Show less' : 'See all'}
              </button>
            )}
          </div>

          {activity.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-5 text-center">
              <p className="text-sm text-text-secondary">No activity yet.</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Apply to a project or create one to see it here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleActivity.map((item) => {
                const visual = getProjectVisual(item.projectId)
                const Icon = item.kind === 'application' ? FileText : Users
                const dotColor =
                  item.status === 'rejected'
                    ? 'bg-danger'
                    : item.kind === 'membership' || item.status === 'accepted'
                    ? 'bg-success'
                    : 'bg-warning'
                const pillLabel =
                  item.kind === 'membership'
                    ? 'Active'
                    : item.status
                    ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                    : ''
                const pillClass =
                  pillLabel === 'Rejected'
                    ? 'border-danger/50 text-danger'
                    : pillLabel === 'Pending'
                    ? 'border-warning/50 text-warning'
                    : 'border-success/50 text-success'

                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/project/${item.projectId}`)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:border-accent/50"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: visual.bg }}
                    >
                      <Icon size={15} style={{ color: visual.fg }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{item.projectTitle}</p>
                      <p className="truncate text-xs text-text-muted">
                        {item.kind === 'application' ? 'You applied to this project' : 'You are a team member'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${pillClass}`}>
                      {pillLabel}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
