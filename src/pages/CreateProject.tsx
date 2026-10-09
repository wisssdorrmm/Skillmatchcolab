import { useNavigate } from 'react-router-dom'
import { createProject } from '../services/projects.service'
import { PageHeader } from '../components/ui/PageHeader'
import { useToast } from '../components/ui/Toast'
import { ProjectForm } from '../components/project/ProjectForm'
import { EMPTY_PROJECT } from '../lib/roadmap'

export default function CreateProject() {
  const navigate = useNavigate()
  const toast = useToast()
  return (
    <div>
      <PageHeader back title="New project" subtitle="Share what you're building and the roadmap to get there." />
      <ProjectForm
        initial={EMPTY_PROJECT}
        submitLabel="Publish project"
        onSubmit={async (input) => {
          const id = await createProject(input)
          toast('Project published — +40 XP')
          navigate(`/project/${id}`, { replace: true })
        }}
      />
    </div>
  )
}
