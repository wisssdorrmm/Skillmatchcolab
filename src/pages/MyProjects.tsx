import { useState } from 'react'
import { FolderKanban, Plus, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { useSaved } from '../hooks/useSaved'
import { listMyProjects } from '../services/projects.service'
import { PageHeader } from '../components/ui/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { ButtonLink } from '../components/ui/Button'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { ProjectCard } from '../components/project/ProjectCard'

type Tab = 'owned' | 'joined'

export default function MyProjects() {
  const { user } = useAuth()
  const { saved, toggle } = useSaved()
  const [tab, setTab] = useState<Tab>('owned')
  const { data, loading, error, reload } = useAsync(() => listMyProjects(user!.id), [user?.id])
  const list = tab === 'owned' ? (data?.owned ?? []) : (data?.joined ?? [])

  return (
    <div>
      <PageHeader
        title="My projects"
        subtitle="Everything you're building and contributing to."
        actions={
          <ButtonLink to="/projects/new" icon={<Plus size={16} />} className="hidden sm:inline-flex">
            New project
          </ButtonLink>
        }
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'owned', label: 'Created by me', count: data?.owned.length },
          { value: 'joined', label: 'Joined', count: data?.joined.length },
        ]}
      />
      <div className="mt-5">
        {loading ? (
          <ListSkeleton rows={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : list.length === 0 ? (
          tab === 'owned' ? (
            <EmptyState
              icon={<FolderKanban size={22} />}
              title="You haven't posted a project yet"
              body="Share your idea with a roadmap and find people to build it with."
              action={
                <ButtonLink to="/projects/new" icon={<Plus size={16} />}>
                  Create a project
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              icon={<Users size={22} />}
              title="You haven't joined a team yet"
              body="Find a project that needs your skills and apply."
              action={<ButtonLink to="/explore?tab=community">Browse projects</ButtonLink>}
            />
          )
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((p) => (
              <ProjectCard key={p.id} project={p} saved={saved.has(p.id)} onToggleSave={toggle} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
