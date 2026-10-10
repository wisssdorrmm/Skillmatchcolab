import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Flame, HandCoins, ListChecks, MessagesSquare, Smartphone, Sparkles, Trophy, Users } from 'lucide-react'
import { BRAND } from '../config/brand'
import { cn } from '../lib/cn'
import { Logo } from '../components/Logo'
import { RailCard } from '../components/widgets'
import { Avatar } from '../components/ui/Avatar'
import { ButtonLink } from '../components/ui/Button'
import { GithubIcon } from '../components/ui/GithubIcon'
import { ProgressBar } from '../components/ui/ProgressBar'

const ROLES = [
  'Developers',
  'Designers',
  'Writers',
  'Marketers',
  'Community managers',
  'Translators',
  'Testers',
  'Researchers',
  'Product managers',
  'Founders',
  'Students',
]

const FEATURES: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <Users size={22} />,
    title: 'Find your team',
    body: "Post what you're building and the roles you need. Builders with matching skills get notified and apply to join.",
  },
  {
    icon: <ListChecks size={22} />,
    title: 'Roadmaps that move',
    body: 'Split your project into steps that add up to 100%. Tick one off and your progress bar moves, live, for everyone.',
  },
  {
    icon: <GithubIcon size={22} />,
    title: '900+ projects asking for help',
    body: 'Real open-source projects and open calls that need code, design, writing, translation, testing and more.',
  },
  {
    icon: <MessagesSquare size={22} />,
    title: 'A community that ships',
    body: 'Introduce yourself, show your build and find a team in community rooms, team chats and direct messages.',
  },
  {
    icon: <Trophy size={22} />,
    title: 'XP, streaks and a leaderboard',
    body: 'Earn XP for shipping steps, joining teams and helping out. Keep your streak alive and climb the weekly board.',
  },
  {
    icon: <HandCoins size={22} />,
    title: "Funding when you're ready",
    body: 'Apply for funding in the app and browse grants and credit programs from other organisations.',
  },
]

const STEPS = [
  { title: 'Set up your profile', body: 'Six quick questions about your role, skills and goals.' },
  { title: 'Start or join a project', body: 'Post your idea with a roadmap, or apply to a project that needs you.' },
  { title: 'Ship in public', body: 'Tick off steps, earn XP and watch your progress bar fill.' },
]

// Sample data for the product preview in the hero — not real members.
const ROADMAP = [
  { title: 'Design the booking flow', weight: 20, done: true },
  { title: 'Build the rider app', weight: 25, done: true },
  { title: 'Driver sign-up', weight: 20, done: true },
  { title: 'Add payments', weight: 20, done: false },
  { title: 'Launch on two campuses', weight: 15, done: false },
]
const ROADMAP_DONE = ROADMAP.filter((s) => s.done)
const ROADMAP_PROGRESS = ROADMAP_DONE.reduce((sum, s) => sum + s.weight, 0)

const SHIPPED = [
  { name: 'Ada', step: 'Driver sign-up', project: 'Campus Rides', progress: 65, weight: 20 },
  { name: 'Lucas', step: 'Dark mode', project: 'Notely', progress: 80, weight: 15 },
  { name: 'Zainab', step: 'Launch copy', project: 'Farmlink', progress: 40, weight: 10 },
  { name: 'Mei', step: 'Translations', project: 'Open Recipes', progress: 55, weight: 25 },
]

const TOP_BUILDERS = [
  { name: 'Ada', role: 'Developer', xp: 1240 },
  { name: 'Kwame', role: 'Designer', xp: 980 },
  { name: 'Mei', role: 'Translator', xp: 860 },
]
const RANK_STYLES = ['text-gold', 'text-silver', 'text-bronze']

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-balance text-[28px] font-bold leading-tight tracking-tight text-text-primary sm:text-4xl">{title}</h2>
      <p className="mt-3 text-balance text-[16px] leading-relaxed text-text-secondary sm:text-[17px]">{subtitle}</p>
    </div>
  )
}

function ProductPreview() {
  return (
    <div className="mx-auto mt-14 max-w-xl text-left lg:max-w-none" aria-hidden="true">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
        <RailCard title="Just shipped" className="hidden lg:mt-12 lg:block">
          <div className="flex flex-col gap-3.5">
            {SHIPPED.map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <Avatar name={s.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-text-primary">
                    <span className="font-semibold">{s.name}</span> finished “{s.step}”
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-secondary">
                    {s.project} · {s.progress}%
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-accent/10 px-2 py-1 text-[11px] font-bold text-accent">+{s.weight}%</span>
              </div>
            ))}
          </div>
        </RailCard>

        <div className="rounded-2xl border border-border-strong bg-surface p-5 shadow-2xl shadow-black/50 sm:p-6">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1b2a3c] text-[#8ec5ff]">
              <Smartphone size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold text-text-primary">Campus Rides</p>
              <p className="truncate text-[13px] text-text-secondary">Carpooling for students</p>
            </div>
            <span className="shrink-0 rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning">Building</span>
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wider text-text-muted">Progress</p>
              <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-text-primary">{ROADMAP_PROGRESS}%</p>
            </div>
            <p className="pb-1 text-sm text-text-secondary">
              {ROADMAP_DONE.length} of {ROADMAP.length} steps done
            </p>
          </div>
          <ProgressBar value={ROADMAP_PROGRESS} size="lg" className="mt-4" />

          <ol className="mt-5 flex flex-col gap-2">
            {ROADMAP.map((step) => (
              <li key={step.title} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    step.done ? 'border-accent bg-accent text-accent-ink' : 'border-border-strong',
                  )}
                >
                  {step.done && <Check size={12} strokeWidth={3} />}
                </span>
                <span className={cn('min-w-0 flex-1 truncate text-sm', step.done ? 'text-text-secondary line-through' : 'font-medium text-text-primary')}>
                  {step.title}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-text-muted">{step.weight}%</span>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex items-center justify-between gap-3 text-[12px] text-text-secondary">
            <span className="min-w-0 truncate">
              <span className="text-text-muted">Needs </span>
              UI/UX Designer, QA Tester
            </span>
            <span className="inline-flex shrink-0 items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Users size={13} /> 4
              </span>
              <span className="inline-flex items-center gap-1 text-warning">
                <Flame size={13} /> 18
              </span>
            </span>
          </div>
        </div>

        <RailCard title="Top builders" className="hidden lg:mt-12 lg:block">
          <ol className="flex flex-col gap-3">
            {TOP_BUILDERS.map((b, i) => (
              <li key={b.name} className="flex items-center gap-3">
                <span className={cn('w-5 text-center text-sm font-bold tabular-nums', RANK_STYLES[i])}>{i + 1}</span>
                <Avatar name={b.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">{b.name}</span>
                  <span className="block truncate text-xs text-text-secondary">{b.role}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-accent">{b.xp.toLocaleString('en-US')} XP</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <Flame size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">7-day streak</p>
              <p className="truncate text-xs text-text-secondary">Ship today to keep it.</p>
            </div>
          </div>
        </RailCard>
      </div>
      <p className="mt-5 text-center text-xs text-text-muted">A peek inside {BRAND.name}, shown with sample data.</p>
    </div>
  )
}

/** Public home page for visitors who aren't signed in. */
export default function Landing() {
  const [lead, punch] = BRAND.tagline.split('. ')

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-text-secondary md:flex" aria-label="Page sections">
            <a href="#features" className="hover:text-text-primary">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-text-primary">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-1.5">
            <ButtonLink to="/login" variant="ghost" size="sm" className="max-[359px]:hidden">
              Log in
            </ButtonLink>
            <ButtonLink to="/signup" size="sm">
              Get started
            </ButtonLink>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 text-center sm:px-8 sm:pb-24 sm:pt-20">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] font-medium text-text-secondary">
              <Sparkles size={14} className="shrink-0 text-accent" />
              For builders of every kind, not just coders
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-[42px] font-bold leading-[1.05] tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
              {lead}.<span className="block text-accent">{punch}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-[17px] leading-relaxed text-text-secondary sm:text-lg">{BRAND.description}</p>

            <div className="mx-auto mt-8 flex max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
              <ButtonLink to="/signup" size="lg" className="sm:px-7">
                Get started free
                <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink to="/login" size="lg" variant="outline" className="sm:px-7">
                Log in
              </ButtonLink>
            </div>
            <p className="mt-4 text-[13px] text-text-muted">Free to join. Six quick questions and you're in.</p>

            <ProductPreview />
          </div>
        </section>

        <section className="border-y border-border bg-sidebar">
          <div className="mx-auto max-w-4xl px-5 py-12 text-center sm:px-8 sm:py-14">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-text-muted">Every project needs more than code</p>
            <ul className="mt-5 flex flex-wrap justify-center gap-2">
              {ROLES.map((role) => (
                <li key={role} className="rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-medium text-text-primary">
                  {role}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <SectionHeading title="Everything you need to go from idea to shipped" subtitle="One place to find people, plan the work, show your progress and get support." />
            <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center sm:p-7">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">{f.icon}</span>
                  <h3 className="mt-4 text-[17px] font-semibold text-text-primary">{f.title}</h3>
                  <p className="mt-2 text-balance text-[15px] leading-relaxed text-text-secondary">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-16 border-t border-border bg-sidebar">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <SectionHeading title="Up and running in three steps" subtitle="No long forms. Join today and ship your first step this week." />
            <ol className="mt-10 grid gap-8 sm:mt-12 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex flex-col items-center text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-bold text-accent-ink">{i + 1}</span>
                  <h3 className="mt-4 text-[17px] font-semibold text-text-primary">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-balance text-[15px] leading-relaxed text-text-secondary">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="flex flex-col items-center rounded-3xl border border-accent/25 bg-gradient-to-b from-accent/[0.12] to-transparent px-6 py-12 text-center sm:px-10 sm:py-16">
              <h2 className="max-w-xl text-balance text-[28px] font-bold leading-tight tracking-tight text-text-primary sm:text-4xl">Ready to build something?</h2>
              <p className="mt-3 max-w-md text-balance text-[16px] leading-relaxed text-text-secondary sm:text-[17px]">
                Join {BRAND.name}, find your team and start ticking off your roadmap.
              </p>
              <ButtonLink to="/signup" size="lg" className="mt-8 w-full max-w-xs sm:w-auto sm:px-7">
                Create your account
                <ArrowRight size={18} />
              </ButtonLink>
              <p className="mt-4 text-sm text-text-secondary">
                Already a member?{' '}
                <Link to="/login" className="font-semibold text-accent hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-10 text-center sm:px-8">
          <Logo />
          <p className="max-w-sm text-balance text-sm text-text-secondary">{BRAND.description}</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 text-sm text-text-secondary" aria-label="Footer">
            <Link to="/signup" className="py-2 hover:text-text-primary">
              Sign up
            </Link>
            <Link to="/login" className="py-2 hover:text-text-primary">
              Log in
            </Link>
            <Link to="/terms" className="py-2 hover:text-text-primary">
              Terms
            </Link>
            <Link to="/privacy" className="py-2 hover:text-text-primary">
              Privacy
            </Link>
          </nav>
          <p className="text-[13px] text-text-muted">
            © {new Date().getFullYear()} {BRAND.name}
          </p>
        </div>
      </footer>
    </div>
  )
}
