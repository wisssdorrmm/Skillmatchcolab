import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  Box,
  Brain,
  Cloud,
  Flame,
  Gamepad2,
  Globe,
  GraduationCap,
  HeartPulse,
  Layers,
  Leaf,
  ListChecks,
  Palette,
  Shield,
  ShoppingBag,
  Smartphone,
  Star,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { compactNumber, timeAgo } from '../../lib/format'
import { STAGES, STAGE_STYLES, labelFor } from '../../lib/constants'
import type { ProjectCard as ProjectCardData } from '../../services/projects.service'
import { ProgressBar } from '../ui/ProgressBar'
import { GithubIcon } from '../ui/GithubIcon'
import { VerifiedBadge } from '../ui/VerifiedBadge'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'AI & ML': Brain,
  'Developer Tools': Wrench,
  Web: Globe,
  Mobile: Smartphone,
  Web3: Layers,
  Fintech: Wallet,
  Health: HeartPulse,
  Education: GraduationCap,
  Games: Gamepad2,
  Security: Shield,
  'DevOps & Cloud': Cloud,
  'Design & UI': Palette,
  Productivity: ListChecks,
  Social: Users,
  'E-commerce': ShoppingBag,
  Climate: Leaf,
}

const TINTS = [
  'bg-[#22301a] text-[#d4f75c]',
  'bg-[#1b2a3c] text-[#8ec5ff]',
  'bg-[#35202f] text-[#f5a3e3]',
  'bg-[#372c19] text-[#fcd34d]',
  'bg-[#183631] text-[#6ee7c7]',
  'bg-[#2a2140] text-[#c4b5fd]',
]

function tint(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}

export function ProjectIcon({
  project,
  size = 'md',
}: {
  project: Pick<ProjectCardData, 'id' | 'category' | 'source' | 'external_owner' | 'title'>
  size?: 'md' | 'lg'
}) {
  const [broken, setBroken] = useState(false)
  const box = size === 'lg' ? 'h-16 w-16 rounded-2xl' : 'h-12 w-12 rounded-xl'
  if (project.source === 'github' && project.external_owner && !broken) {
    return (
      <img
        src={`https://github.com/${project.external_owner}.png?size=96`}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className={cn(box, 'shrink-0 border border-border bg-surface-2 object-cover')}
      />
    )
  }
  const Icon = CATEGORY_ICONS[project.category ?? ''] ?? Box
  return (
    <span className={cn(box, 'flex shrink-0 items-center justify-center', tint(project.category ?? project.id))}>
      <Icon size={size === 'lg' ? 28 : 22} />
    </span>
  )
}

interface ProjectCardProps {
  project: ProjectCardData
  saved?: boolean
  onToggleSave?: (projectId: string) => void
  matchedOn?: string[]
}

export function ProjectCard({ project, saved, onToggleSave, matchedOn }: ProjectCardProps) {
  const isGithub = project.source === 'github'
  const imported = project.source !== 'community'
  const roles = project.project_roles_needed ?? []
  const team = project.project_members?.[0]?.count ?? 0
  const hypes = project.project_upvotes?.[0]?.count ?? 0
  const blurb = project.tagline || project.description

  const toggleSave = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleSave?.(project.id)
  }

  return (
    <Link
      to={`/project/${project.id}`}
      className="group block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2/40 sm:p-5"
    >
      <div className="flex gap-3.5">
        <ProjectIcon project={project} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[16px] font-semibold text-text-primary group-hover:text-accent">{project.title}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-text-secondary">
                {imported && !isGithub ? (
                  <>
                    <Globe size={13} className="shrink-0" />
                    <span className="truncate">
                      {project.external_owner ?? 'Open call'} · via {project.external_source ?? 'the web'}
                    </span>
                  </>
                ) : isGithub ? (
                  <>
                    <GithubIcon size={13} className="shrink-0" />
                    <span className="truncate">{project.external_owner}</span>
                    {project.external_stars != null && (
                      <>
                        <span className="text-text-muted">·</span>
                        <Star size={12} className="shrink-0 text-gold" />
                        {compactNumber(project.external_stars)}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span className="truncate">by {project.owner?.name ?? 'a builder'}</span>
                    <VerifiedBadge show={project.owner?.is_verified} size={13} />
                    <span className="text-text-muted">·</span>
                    <span className="shrink-0">{timeAgo(project.created_at)}</span>
                  </>
                )}
              </p>
            </div>
            {onToggleSave && (
              <button
                type="button"
                onClick={toggleSave}
                aria-label={saved ? 'Remove from saved' : 'Save project'}
                aria-pressed={saved}
                className="-mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary"
              >
                <Bookmark size={18} className={saved ? 'fill-accent text-accent' : ''} />
              </button>
            )}
          </div>

          {blurb && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary">{blurb}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {isGithub ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">Open source</span>
            ) : imported ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2.5 py-1 text-[11px] font-semibold text-info">Open call</span>
            ) : (
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', STAGE_STYLES[project.stage] ?? 'bg-surface-2 text-text-secondary')}>
                {labelFor(STAGES, project.stage)}
              </span>
            )}
            {project.category && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text-secondary">{project.category}</span>}
            {project.status === 'closed' && !imported && (
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text-muted">Team full</span>
            )}
          </div>

          {!imported && (
            <ProgressBar value={project.progress} showLabel size="sm" className="mt-3.5" label={`${project.title} progress`} />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-text-secondary">
            {roles.length > 0 && (
              <span className="min-w-0 truncate">
                <span className="text-text-muted">Needs </span>
                {matchedOn?.length ? (
                  <span className="font-semibold text-accent">{matchedOn.slice(0, 2).join(', ')}</span>
                ) : (
                  roles
                    .slice(0, 2)
                    .map((r) => r.role_name)
                    .join(', ')
                )}
                {roles.length > 2 && ` +${roles.length - 2}`}
              </span>
            )}
            {!imported && (
              <span className="inline-flex shrink-0 items-center gap-1">
                <Users size={13} /> {team}
              </span>
            )}
            <span className={cn('inline-flex shrink-0 items-center gap-1', hypes > 0 && 'text-warning')}>
              <Flame size={13} /> {hypes}
            </span>
            {isGithub && project.external_language && <span className="shrink-0">{project.external_language}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}
