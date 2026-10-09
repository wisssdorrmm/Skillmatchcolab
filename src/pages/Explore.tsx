import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bookmark, Plus, Search, SearchX } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDebounced } from '../hooks/useAsync'
import { useSaved } from '../hooks/useSaved'
import { errorMessage } from '../lib/errors'
import { CATEGORIES, ROLE_GROUPS } from '../lib/constants'
import { listProjects, listProjectsByIds, type ProjectCard as ProjectCardData, type ProjectSort } from '../services/projects.service'
import { getSkillsForUser } from '../services/profiles.service'
import { rankProjects } from '../services/matching.service'
import { PageHeader } from '../components/ui/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { Chip } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Select } from '../components/ui/Field'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { ProjectCard } from '../components/project/ProjectCard'

type Tab = 'all' | 'community' | 'github' | 'saved'
const PAGE = 20

const SORTS: Record<Tab, { value: ProjectSort; label: string }[]> = {
  all: [
    { value: 'newest', label: 'Newest' },
    { value: 'updated', label: 'Recently active' },
    { value: 'progress', label: 'Most progress' },
  ],
  community: [
    { value: 'newest', label: 'Newest' },
    { value: 'updated', label: 'Recently active' },
    { value: 'progress', label: 'Most progress' },
  ],
  github: [
    { value: 'stars', label: 'Most stars' },
    { value: 'newest', label: 'Recently added' },
  ],
  saved: [{ value: 'newest', label: 'Newest' }],
}

export default function Explore() {
  const { user, profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = (['all', 'community', 'github', 'saved'].includes(params.get('tab') ?? '') ? params.get('tab') : 'all') as Tab
  const category = params.get('category') ?? ''
  const roleGroup = ROLE_GROUPS.find((g) => g.key === params.get('role')) ?? null
  const roleNames = roleGroup?.roles
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [sort, setSort] = useState<ProjectSort>(tab === 'github' ? 'stars' : 'newest')
  const q = useDebounced(search, 300)

  const { saved, toggle } = useSaved()
  const [items, setItems] = useState<ProjectCardData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (user) getSkillsForUser(user.id).then((s) => setSkills(s.map((x) => x.name))).catch(() => {})
  }, [user])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const changeTab = (t: Tab) => {
    setSort(t === 'github' ? 'stars' : 'newest')
    setParam('tab', t === 'all' ? '' : t)
  }

  // Saved tab needs ids; keep them in sync with bookmarks.
  const savedKey = tab === 'saved' ? Array.from(saved).sort().join(',') : ''

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const run = async () => {
      if (tab === 'saved') {
        const list = await listProjectsByIds(savedKey ? savedKey.split(',') : [])
        const needle = q.trim().toLowerCase()
        const filtered = list.filter(
          (p) =>
            (!category || p.category === category) &&
            (!roleNames || p.project_roles_needed.some((r) => roleNames.includes(r.role_name))) &&
            (!needle || `${p.title} ${p.description ?? ''}`.toLowerCase().includes(needle)),
        )
        return { items: filtered, total: filtered.length }
      }
      return listProjects({
        search: q,
        category: category || undefined,
        roles: roleNames,
        source: tab === 'all' ? undefined : tab === 'github' ? 'imported' : tab,
        sort,
        limit: PAGE,
        offset: 0,
      })
    }
    run()
      .then((res) => {
        if (cancelled) return
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [tab, q, category, roleGroup?.key, sort, savedKey, reloadKey])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const res = await listProjects({
        search: q,
        category: category || undefined,
        roles: roleNames,
        source: tab === 'all' ? undefined : tab === 'github' ? 'imported' : (tab as 'community'),
        sort,
        limit: PAGE,
        offset: items.length,
      })
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...res.items.filter((p) => !seen.has(p.id))]
      })
      setTotal(res.total)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  // Light-touch "for you" boost: show matches first without hiding anything.
  const ranked = useMemo(() => {
    if (tab === 'saved' || sort !== 'newest') return items.map((p) => ({ ...p, _matchedOn: [] as string[] }))
    return rankProjects(items, profile?.primary_role, skills)
  }, [items, profile?.primary_role, skills, tab, sort])

  return (
    <div>
      <PageHeader
        title="Explore projects"
        subtitle="Join a team, contribute to open source, or find inspiration."
        actions={
          <ButtonLink to="/projects/new" icon={<Plus size={16} />} className="hidden sm:inline-flex">
            New project
          </ButtonLink>
        }
      />

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setParam('q', e.target.value)
          }}
          placeholder="Search projects, tech or GitHub orgs"
          aria-label="Search projects"
          className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <Tabs<Tab>
        className="mt-4"
        value={tab}
        onChange={changeTab}
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'community', label: 'Community' },
          { value: 'github', label: 'Open source & calls' },
          { value: 'saved', label: 'Saved', count: saved.size },
        ]}
      />

      <div className="mt-4">
        <p className="mb-2 text-[13px] font-medium text-text-secondary">Looking for</p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Chip active={!roleGroup} onClick={() => setParam('role', '')}>
            Anyone
          </Chip>
          {ROLE_GROUPS.map((g) => (
            <Chip key={g.key} active={roleGroup?.key === g.key} onClick={() => setParam('role', roleGroup?.key === g.key ? '' : g.key)}>
              {g.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="no-scrollbar -mx-4 flex flex-1 gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Chip active={!category} onClick={() => setParam('category', '')}>
            All topics
          </Chip>
          {CATEGORIES.filter((c) => c !== 'Other').map((c) => (
            <Chip key={c} active={category === c} onClick={() => setParam('category', category === c ? '' : c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="whitespace-nowrap text-sm text-text-secondary">{loading ? 'Loading…' : `${total} ${total === 1 ? 'project' : 'projects'}`}</p>
        {SORTS[tab].length > 1 && (
          <div className="w-[180px] shrink-0">
            <Select value={sort} onChange={(e) => setSort(e.target.value as ProjectSort)} aria-label="Sort projects" className="h-10 text-sm">
              {SORTS[tab].map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="mt-3">
        {loading ? (
          <ListSkeleton rows={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : ranked.length === 0 ? (
          tab === 'saved' ? (
            <EmptyState icon={<Bookmark size={22} />} title="Nothing saved yet" body="Tap the bookmark on any project to keep it here." />
          ) : (
            <EmptyState
              icon={<SearchX size={22} />}
              title="No projects match"
              body={q || category || roleGroup ? 'Try a different search, role or topic.' : 'Be the first to post one.'}
              action={
                q || category || roleGroup ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('')
                      setParams(new URLSearchParams(tab === 'all' ? {} : { tab }), { replace: true })
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <ButtonLink to="/projects/new" icon={<Plus size={16} />}>
                    Post a project
                  </ButtonLink>
                )
              }
            />
          )
        ) : (
          <div className="flex flex-col gap-3">
            {ranked.map((p) => (
              <ProjectCard key={p.id} project={p} saved={saved.has(p.id)} onToggleSave={toggle} matchedOn={p._matchedOn} />
            ))}
            {tab !== 'saved' && items.length < total && (
              <Button variant="secondary" onClick={loadMore} loading={loadingMore} className="mx-auto mt-2">
                Load more
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
