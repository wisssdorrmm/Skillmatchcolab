import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { getProject, updateProject } from '../services/projects.service'
import { PageHeader } from '../components/ui/PageHeader'
import { ErrorState, ListSkeleton } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { ProjectForm, type ProjectFormValues } from '../components/project/ProjectForm'

export default function EditProject() {
  const { id = '' } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: project, loading, error, reload } = useAsync(() => getProject(id), [id])

  if (loading) return <ListSkeleton rows={4} />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!project) return <Navigate to="/explore" replace />
  if (project.owner_id !== user?.id && !isAdmin) return <Navigate to={`/project/${id}`} replace />

  const initial: ProjectFormValues = {
    title: project.title,
    tagline: project.tagline ?? '',
    description: project.description ?? '',
    category: project.category ?? '',
    stage: project.stage ?? 'building',
    open: project.status !== 'closed',
    roles: project.project_roles_needed.map((r) => r.role_name),
    tech: project.tech_stack ?? [],
    repo: project.repo_url ?? '',
    demo: project.demo_url ?? '',
    steps: project.project_milestones.map((m) => ({ key: m.id, id: m.id, title: m.title, weight: m.weight, isDone: m.is_done })),
  }

  return (
    <div>
      <PageHeader back title="Edit project" subtitle="Finished steps stay finished when you change the roadmap." />
      <ProjectForm
        initial={initial}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          await updateProject(id, input)
          toast('Project updated')
          navigate(`/project/${id}`, { replace: true })
        }}
      />
    </div>
  )
}
