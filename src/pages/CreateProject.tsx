import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { createProject } from '../services/projects.service'
import type { ProjectStatus } from '../types/database'

export default function CreateProject() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('open')
  const [roleInput, setRoleInput] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addRole = () => {
    const trimmed = roleInput.trim()
    if (trimmed && !roles.includes(trimmed)) {
      setRoles((prev) => [...prev, trimmed])
    }
    setRoleInput('')
  }

  const removeRole = (role: string) => setRoles((prev) => prev.filter((r) => r !== role))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    setLoading(true)
    try {
      const project = await createProject({
        ownerId: user.id,
        title: title.trim(),
        description: description.trim(),
        status,
        roles,
      })
      navigate(`/project/${project.id}`, { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'Could not create project.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Create Project</h1>
          <p className="text-sm text-text-secondary">Start building your team.</p>
        </div>
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text-secondary">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Project Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. AI-Powered Budget Tracker"
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Description</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you building? What's the vision?"
            className="w-full resize-none rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Roles Looking For</label>
          <div className="flex gap-2">
            <input
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addRole()
                }
              }}
              placeholder="Flutter Developer"
              className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={addRole}
              className="rounded-lg border border-border px-4 text-sm text-text-secondary hover:border-accent hover:text-accent"
            >
              Add
            </button>
          </div>
          {roles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {roles.map((role) => (
                <span
                  key={role}
                  className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs text-accent"
                >
                  {role}
                  <button type="button" onClick={() => removeRole(role)} aria-label={`Remove ${role}`}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-accent py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? 'Publishing…' : 'Publish Project'}
        </button>
      </form>
    </div>
  )
}
