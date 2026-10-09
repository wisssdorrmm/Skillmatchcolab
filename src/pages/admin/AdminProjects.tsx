import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, Trash2 } from 'lucide-react'
import { useDebounced } from '../../hooks/useAsync'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../lib/errors'
import { compactNumber, formatDate } from '../../lib/format'
import { deleteProject, listProjects, type ProjectCard } from '../../services/projects.service'
import { setFeatured } from '../../services/admin.service'
import { Tabs } from '../../components/ui/Tabs'
import { Button, ButtonLink } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Modal'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { ProjectIcon } from '../../components/project/ProjectCard'

type Source = 'community' | 'github'

export default function AdminProjects() {
  const toast = useToast()
  const [source, setSource] = useState<Source>('community')
  const [search, setSearch] = useState('')
  const q = useDebounced(search, 300)
  const [items, setItems] = useState<ProjectCard[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [more, setMore] = useState(false)
  const [toDelete, setToDelete] = useState<ProjectCard | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listProjects({ source, search: q, sort: source === 'github' ? 'stars' : 'newest', limit: 40 })
      .then((r) => {
        if (cancelled) return
        setItems(r.items)
        setTotal(r.total)
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [source, q, reloadKey])

  const loadMore = async () => {
    setMore(true)
    try {
      const r = await listProjects({ source, search: q, sort: source === 'github' ? 'stars' : 'newest', limit: 40, offset: items.length })
      setItems((prev) => [...prev, ...r.items.filter((x) => !prev.some((p) => p.id === x.id))])
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setMore(false)
    }
  }

  const feature = async (p: ProjectCard) => {
    try {
      await setFeatured(p.id, !p.is_featured)
      setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_featured: !p.is_featured } : x)))
      toast(p.is_featured ? 'Removed from featured' : 'Featured — it now shows first in Explore')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const remove = async () => {
    if (!toDelete) return
    const target = toDelete
    setToDelete(null)
    try {
      await deleteProject(target.id)
      setItems((prev) => prev.filter((x) => x.id !== target.id))
      setTotal((t) => t - 1)
      toast('Project deleted')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Projects</h1>
          <p className="mt-1 text-text-secondary">{loading ? 'Loading…' : `${total} ${source === 'github' ? 'open-source' : 'community'} projects`}</p>
        </div>
        <ButtonLink to="/admin/import" variant="secondary" size="sm">
          Import from GitHub
        </ButtonLink>
      </div>

      <Tabs<Source>
        className="mt-5"
        value={source}
        onChange={setSource}
        tabs={[
          { value: 'community', label: 'Community' },
          { value: 'github', label: 'Open source' },
        ]}
      />
      <div className="relative mt-3">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects"
          aria-label="Search projects"
          className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <ListSkeleton rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : items.length === 0 ? (
          <EmptyState title="No projects" />
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <ProjectIcon project={p} />
                <Link to={`/project/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text-primary hover:text-accent">{p.title}</p>
                  <p className="truncate text-xs text-text-secondary">
                    {p.source === 'github' ? `${p.external_owner} · ★ ${compactNumber(p.external_stars)}` : `${p.owner?.name ?? 'Unknown'} · ${formatDate(p.created_at)}`}
                  </p>
                  {p.source === 'community' && <ProgressBar value={p.progress} size="xs" showLabel className="mt-1.5 max-w-xs" />}
                </Link>
                <button
                  onClick={() => feature(p)}
                  aria-pressed={p.is_featured}
                  aria-label={p.is_featured ? 'Unfeature' : 'Feature'}
                  title={p.is_featured ? 'Featured' : 'Feature this project'}
                  className={cn('flex h-10 w-10 items-center justify-center rounded-xl', p.is_featured ? 'text-gold' : 'text-text-muted hover:bg-surface-2 hover:text-text-primary')}
                >
                  <Star size={18} className={p.is_featured ? 'fill-gold' : ''} />
                </button>
                <button
                  onClick={() => setToDelete(p)}
                  aria-label="Delete project"
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
        {!loading && items.length < total && (
          <Button variant="secondary" className="mx-auto mt-4 flex" loading={more} onClick={loadMore}>
            Load more
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title={`Delete ${toDelete?.title ?? 'project'}?`}
        body="This removes it for everyone, including its roadmap, team and chats."
        confirmLabel="Delete"
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}
