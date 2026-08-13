import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { listMyCreatedProjects, listMyJoinedProjects } from '../services/projects.service'
import type { Project } from '../types/database'

type Tab = 'created' | 'joined'

export default function MyProjects() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('created')
  const [created, setCreated] = useState<Project[]>([])
  const [joined, setJoined] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([listMyCreatedProjects(user.id), listMyJoinedProjects(user.id)])
      .then(([c, j]) => {
        setCreated(c)
        setJoined(j)
      })
      .finally(() => setLoading(false))
  }, [user])

  const list = tab === 'created' ? created : joined

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">My Projects</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/create-project')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-hover"
            aria-label="New project"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-accent/20 text-xs font-semibold text-accent"
            aria-label="Profile"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile?.name ?? 'U').charAt(0).toUpperCase()
            )}
          </button>
        </div>
      </div>
      <p className="mb-5 text-sm text-text-secondary">Manage your collaborations and applications.</p>

      <div className="mb-5 flex gap-2 rounded-lg bg-surface p-1">
        {(['created', 'joined'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'created' ? 'Created by me' : 'Joined'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-text-muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-secondary">
          {tab === 'created' ? "You haven't created any projects yet." : "You haven't joined any projects yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((project) => (
            <button
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="rounded-xl border border-border bg-surface p-4 text-left hover:border-accent/50"
            >
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-medium text-text-primary">{project.title}</h3>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] capitalize text-accent">
                  {project.status?.replace('_', ' ')}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-text-secondary">{project.description}</p>
              {tab === 'created' && (
                <div
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/project/${project.id}/applications`)
                  }}
                  className="mt-3 inline-block rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent"
                >
                  Manage Applicants
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
