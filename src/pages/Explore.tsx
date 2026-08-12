import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, Bookmark } from 'lucide-react'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../context/AuthContext'
import { listProjects } from '../services/projects.service'
import { getSkillsForUser } from '../services/profiles.service'
import { rankProjects, type RankedProject } from '../services/matching.service'
import { getProjectVisual } from '../utils/projectVisual'
import { timeAgo } from '../utils/timeAgo'
import { getSavedProjectIds, saveProject, unsaveProject } from '../services/saved.service'

type Tab = 'all' | 'recommended' | 'newest' | 'active'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All Projects' },
  { key: 'recommended', label: 'Recommended' },
  { key: 'newest', label: 'Newest' },
  { key: 'active', label: 'Most Active' },
]

export default function Explore() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [ranked, setRanked] = useState<RankedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())

  const availableRoles = useMemo(() => {
    const roles = new Set<string>()
    ranked.forEach((p) => p.project_roles_needed.forEach((r) => roles.add(r.role_name)))
    return Array.from(roles).sort()
  }, [ranked])

  const toggleRoleFilter = (role: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev)
      next.has(role) ? next.delete(role) : next.add(role)
      return next
    })
  }

  // Always fetches fresh from Supabase — Explore is the live discovery feed,
  // never limited to what the user has previously viewed.
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [projects, mySkills] = await Promise.all([
        listProjects(search),
        getSkillsForUser(user.id),
      ])
      const skillNames = mySkills.map((s) => s.name)
      setRanked(rankProjects(projects, profile?.primary_role, skillNames))
    } catch (err: any) {
      setError(err.message ?? 'Could not load projects.')
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
    const handle = setTimeout(load, 250)
    return () => clearTimeout(handle)
  }, [load])

  useEffect(() => {
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

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

  const visible = useMemo(() => {
    let list: RankedProject[]
    switch (tab) {
      case 'recommended':
        list = ranked.filter((p) => p._matchScore > 0)
        break
      case 'newest':
        list = [...ranked].sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case 'active':
        list = [...ranked].sort((a, b) => {
          const aCount = a.project_members?.[0]?.count ?? 0
          const bCount = b.project_members?.[0]?.count ?? 0
          return bCount - aCount
        })
        break
      case 'all':
      default:
        list = ranked
    }

    if (selectedRoles.size > 0) {
      list = list.filter((p) => p.project_roles_needed.some((r) => selectedRoles.has(r.role_name)))
    }

    return list
  }, [ranked, tab, selectedRoles])

  return (
    <div className="mx-auto max-w-md px-6 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Explore</h1>
        <NotificationBell />
      </div>
      <p className="mb-5 text-sm text-text-secondary">
        Discover projects and find opportunities that match your skills.
      </p>

      <div className="mb-4 flex gap-2.5">
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
          onClick={() => setShowFilterPanel((v) => !v)}
          className={`relative flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-sm transition-colors ${
            selectedRoles.size > 0
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border bg-surface text-text-secondary hover:text-text-primary'
          }`}
        >
          <SlidersHorizontal size={15} /> Filter
          {selectedRoles.size > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">
              {selectedRoles.size}
            </span>
          )}
        </button>
      </div>

      {showFilterPanel && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Filter by role</span>
            {selectedRoles.size > 0 && (
              <button
                onClick={() => setSelectedRoles(new Set())}
                className="text-xs text-accent hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          {availableRoles.length === 0 ? (
            <p className="text-xs text-text-muted">No roles to filter by yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role) => {
                const isSelected = selectedRoles.has(role)
                return (
                  <button
                    key={role}
                    onClick={() => toggleRoleFilter(role)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent text-white'
                        : 'border-border text-text-secondary hover:border-text-muted'
                    }`}
                  >
                    {role}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
              tab === key
                ? 'bg-accent text-white'
                : 'border border-border bg-surface text-text-secondary hover:border-text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="py-10 text-center text-sm text-text-muted">Loading projects…</p>
      ) : visible.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-text-secondary">No projects found.</p>
          <button onClick={() => navigate('/create-project')} className="mt-2 text-sm text-accent hover:underline">
            Post the first one
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((project) => {
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
                  <div className="mb-4 flex flex-wrap gap-2">
                    {project.project_roles_needed.slice(0, 3).map((role) => (
                      <span
                        key={role.id}
                        className="rounded-full border border-accent/30 px-2.5 py-1 text-[11px] font-medium text-accent"
                      >
                        {role.role_name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  {project.project_roles_needed.length > 0 ? (
                    <span className="text-[11px] font-medium text-success">
                      {project.project_roles_needed.length} open position
                      {project.project_roles_needed.length === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="rounded-xl border border-accent/40 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10"
                  >
                    Open Project
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
