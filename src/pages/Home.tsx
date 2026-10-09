import { Link } from 'react-router-dom'
import { ArrowRight, Flame, FolderKanban, MessagesSquare, Plus, Rocket, Sparkles, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { useSaved } from '../hooks/useSaved'
import { firstName, greeting, timeAgo } from '../lib/format'
import { getLeaderboard, getUserStats } from '../services/stats.service'
import { listMyProjects, listProjects, listRecentShips } from '../services/projects.service'
import { listRecentPosts } from '../services/community.service'
import { getSkillsForUser } from '../services/profiles.service'
import { rankProjects } from '../services/matching.service'
import { Section, StatCard } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { ButtonLink } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from '../components/ui/States'
import { ProjectCard, ProjectIcon } from '../components/project/ProjectCard'
import { FundingPromo, Podium, TopBuildersList } from '../components/widgets'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'

export default function Home() {
  const { user, profile } = useAuth()
  const uid = user?.id ?? ''
  const { saved, toggle } = useSaved()

  const stats = useAsync(() => getUserStats(uid), [uid])
  const mine = useAsync(() => listMyProjects(uid), [uid])
  const top = useAsync(async () => {
    const week = await getLeaderboard('week', 6)
    return week.length >= 3 ? { rows: week, label: 'This week' } : { rows: await getLeaderboard('all', 6), label: 'All time' }
  }, [])
  const ships = useAsync(() => listRecentShips(6), [])
  const posts = useAsync(() => listRecentPosts(3), [])
  const forYou = useAsync(async () => {
    const [skills, community, github] = await Promise.all([
      getSkillsForUser(uid),
      listProjects({ source: 'community', limit: 40, onlyOpen: true }),
      listProjects({ source: 'imported', sort: 'stars', limit: 80 }),
    ])
    const names = skills.map((s) => s.name)
    const others = (p: { owner_id: string | null }) => p.owner_id !== uid
    return {
      community: rankProjects(community.items.filter(others), profile?.primary_role, names).slice(0, 3),
      openSource: rankProjects(github.items, profile?.primary_role, names).slice(0, 3),
    }
  }, [uid, profile?.primary_role])

  const s = stats.data
  const owned = mine.data?.owned ?? []
  const joined = mine.data?.joined ?? []

  return (
    <div>
      <header>
        <p className="text-[15px] text-text-secondary">{greeting()},</p>
        <h1 className="mt-0.5 flex items-center gap-2.5 text-[32px] font-bold leading-tight tracking-tight text-text-primary sm:text-[36px]">
          {firstName(profile?.name)}
          <VerifiedBadge show={profile?.is_verified} size={26} />
          {s && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
              <Zap size={12} /> Lv {s.level}
            </span>
          )}
        </h1>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-2.5 sm:gap-3">
        <StatCard label="Projects" value={mine.data ? owned.length : '–'} hint={mine.data ? `${joined.length} joined` : ' '} to="/my-projects" />
        <StatCard
          label="Streak"
          value={
            s ? (
              <span className="inline-flex items-center gap-1">
                {s.current_streak}
                <Flame size={20} className={s.current_streak > 0 ? 'text-warning' : 'text-text-muted'} />
              </span>
            ) : (
              '–'
            )
          }
          hint={s ? `best ${s.best_streak} days` : ' '}
        />
        <StatCard label="XP" value={s ? s.xp : '–'} hint={s ? (s.xp > 0 ? `rank #${s.rank}` : 'not ranked yet') : ' '} accent to="/leaderboard" />
      </div>

      {s && !s.active_today && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-warning/25 bg-warning/[0.06] p-4 sm:flex-row sm:items-center sm:p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <Flame size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-text-primary">
              {s.current_streak > 0 ? `Keep your ${s.current_streak}-day streak alive` : 'Start a streak today'}
            </p>
            <p className="text-[13px] text-text-secondary">Post in a room, tick a roadmap step, or start a project.</p>
          </div>
          <div className="flex gap-2">
            <ButtonLink to="/community" size="sm" variant="secondary" icon={<MessagesSquare size={15} />}>
              Post
            </ButtonLink>
            <ButtonLink to={owned[0] ? `/project/${owned[0].id}` : '/projects/new'} size="sm" icon={<Rocket size={15} />}>
              {owned[0] ? 'Ship a step' : 'New project'}
            </ButtonLink>
          </div>
        </div>
      )}

      <Section title="Your builds" subtitle="Tick off roadmap steps to move your progress bar." action={owned.length ? { label: 'See all', to: '/my-projects' } : undefined}>
        {mine.loading && !mine.data ? (
          <ListSkeleton rows={2} />
        ) : mine.error ? (
          <ErrorState message={mine.error} onRetry={mine.reload} />
        ) : owned.length === 0 && joined.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={22} />}
            title="Share what you're building"
            body="Post a project with a roadmap. Every step you finish fills your progress bar — and the community sees it."
            action={
              <ButtonLink to="/projects/new" icon={<Plus size={16} />}>
                Create a project
              </ButtonLink>
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {[...owned, ...joined].slice(0, 3).map((p) => (
              <Link key={p.id} to={`/project/${p.id}`} className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
                <ProjectIcon project={p} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[15px] font-semibold text-text-primary">{p.title}</p>
                    <span className="shrink-0 text-xs text-text-secondary">{p.owner_id === uid ? 'Owner' : 'Team'}</span>
                  </div>
                  <ProgressBar value={p.progress} showLabel size="sm" className="mt-2.5" label={`${p.title} progress`} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="Top builders" subtitle={top.data ? `${top.data.label} · earn XP by shipping, joining teams and helping out` : undefined} action={{ label: 'Leaderboard', to: '/leaderboard' }}>
        <div className="rounded-2xl border border-border bg-surface p-5">
          {top.loading && !top.data ? (
            <Skeleton className="h-40" />
          ) : top.error ? (
            <ErrorState message={top.error} onRetry={top.reload} />
          ) : (top.data?.rows.length ?? 0) >= 3 ? (
            <>
              <Podium rows={top.data!.rows.slice(0, 3)} />
              {top.data!.rows.length > 3 && (
                <div className="mt-4 border-t border-border pt-3">
                  <TopBuildersList rows={top.data!.rows.slice(3)} />
                </div>
              )}
            </>
          ) : (
            <TopBuildersList rows={top.data?.rows ?? []} />
          )}
        </div>
      </Section>

      <Section title="Just shipped" subtitle="Roadmap steps builders finished recently.">
        {ships.loading && !ships.data ? (
          <ListSkeleton rows={2} />
        ) : !ships.data?.length ? (
          <EmptyState icon={<Rocket size={22} />} title="Nothing shipped yet" body="Be the first — finish a roadmap step on one of your projects." />
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {ships.data.map((sh) => (
              <Link key={sh.id} to={sh.project ? `/project/${sh.project.id}` : '/explore'} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2/50">
                <Avatar name={sh.doer?.name} src={sh.doer?.avatar_url} size="sm" seed={sh.doer?.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">
                    <span className="font-semibold">{sh.doer?.name ?? 'Someone'}</span> finished <span className="font-medium">“{sh.title}”</span>
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {sh.project?.title} · now {sh.project?.progress ?? 0}% · {timeAgo(sh.done_at)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-accent/10 px-2 py-1 text-[11px] font-bold text-accent">+{sh.weight}%</span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <FundingPromo className="mt-8 xl:hidden" />

      <Section title="Projects that need you" subtitle="Matched to your role and skills." action={{ label: 'Explore', to: '/explore' }}>
        {forYou.loading && !forYou.data ? (
          <ListSkeleton rows={2} />
        ) : forYou.error ? (
          <ErrorState message={forYou.error} onRetry={forYou.reload} />
        ) : forYou.data?.community.length ? (
          <div className="flex flex-col gap-3">
            {forYou.data.community.map((p) => (
              <ProjectCard key={p.id} project={p} saved={saved.has(p.id)} onToggleSave={toggle} matchedOn={p._matchedOn} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Sparkles size={22} />}
            title="No community projects yet"
            body="Post yours first — builders who match your roles will be notified."
            action={
              <ButtonLink to="/projects/new" icon={<Plus size={16} />}>
                Post a project
              </ButtonLink>
            }
          />
        )}
      </Section>

      {!!forYou.data?.openSource.length && (
        <Section title="Open projects asking for help" subtitle="Open source and open calls that need your role — code, design, writing, marketing and more." action={{ label: 'See more', to: '/explore?tab=github' }}>
          <div className="flex flex-col gap-3">
            {forYou.data.openSource.map((p) => (
              <ProjectCard key={p.id} project={p} saved={saved.has(p.id)} onToggleSave={toggle} matchedOn={p._matchedOn} />
            ))}
          </div>
        </Section>
      )}

      <Section title="From the community" action={{ label: 'Open community', to: '/community' }}>
        {posts.loading && !posts.data ? (
          <ListSkeleton rows={2} />
        ) : !posts.data?.length ? (
          <Link
            to="/community/introductions"
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
          >
            <MessagesSquare size={20} className="text-accent" />
            <span className="flex-1 text-sm text-text-primary">Say hi in #introductions — tell people what you build.</span>
            <ArrowRight size={16} className="text-text-muted" />
          </Link>
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {posts.data.map((post) => (
              <Link key={post.id} to={`/community/${post.room?.slug ?? 'general'}`} className="flex gap-3 px-4 py-3.5 hover:bg-surface-2/50">
                <Avatar name={post.author?.name} src={post.author?.avatar_url} size="sm" seed={post.author?.id} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-secondary">
                    <span className="font-semibold text-text-primary">{post.author?.name ?? 'Someone'}</span> in #{post.room?.slug} · {timeAgo(post.created_at)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-text-primary">{post.body}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
