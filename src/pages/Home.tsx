import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { listProjects, type ProjectCard } from '../services/projects.service'

export default function Home() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [projects, setProjects] = useState<ProjectCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true)
      listProjects(search)
        .then(setProjects)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [search])

  const firstName = profile?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Good morning, {firstName}</h1>
          <p className="text-sm text-text-secondary">Find your next teammate.</p>
        </div>
        <button
          onClick={() => navigate('/create-project')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover"
          aria-label="Create project"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects, skills, or roles..."
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="py-10 text-center text-sm text-text-muted">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-text-secondary">No projects found.</p>
          <button onClick={() => navigate('/create-project')} className="mt-2 text-sm text-accent hover:underline">
            Post the first one
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent/50"
            >
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-medium text-text-primary">{project.title}</h3>
                <span className="text-xs text-text-muted">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mb-1 text-xs text-text-muted">
                {project.owner?.name ?? 'Unknown'}
              </p>
              <p className="mb-3 line-clamp-2 text-sm text-text-secondary">{project.description}</p>
              {project.project_roles_needed.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {project.project_roles_needed.slice(0, 4).map((role) => (
                    <span
                      key={role.id}
                      className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent"
                    >
                      {role.role_name}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
