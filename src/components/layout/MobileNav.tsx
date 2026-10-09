import { Link, NavLink } from 'react-router-dom'
import { Bell, Compass, HandCoins, Home, Mail, MessagesSquare, Plus, Trophy, User } from 'lucide-react'
import { useUnread } from '../../context/UnreadContext'
import { cn } from '../../lib/cn'
import { LogoMark } from '../Logo'
import { BRAND } from '../../config/brand'

function Dot({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="absolute -right-1.5 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink ring-2 ring-bg">
      {n > 99 ? '99+' : n}
    </span>
  )
}

/** Slim header on phones: logo + quick links to funding, leaderboard and notifications. */
export function MobileTopBar() {
  const unread = useUnread()
  const icon = 'relative flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-2 hover:text-text-primary'
  return (
    <div className="sticky top-0 z-30 border-b border-border/60 bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2" aria-label={`${BRAND.name} home`}>
          <LogoMark className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">
            {BRAND.name.slice(0, 2)}
            <span className="text-accent">{BRAND.name.slice(2)}</span>
          </span>
        </Link>
        <div className="flex items-center">
          <Link to="/funding" className={icon} aria-label="Funding">
            <HandCoins size={21} />
          </Link>
          <Link to="/leaderboard" className={icon} aria-label="Leaderboard">
            <Trophy size={20} />
          </Link>
          <Link to="/notifications" className={icon} aria-label="Notifications">
            <span className="relative">
              <Bell size={21} />
              <Dot n={unread.notifications} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

const tab = ({ isActive }: { isActive: boolean }) =>
  cn('flex flex-1 flex-col items-center gap-1 pt-2 text-[11px] font-medium', isActive ? 'text-accent' : 'text-text-muted')

/** Bottom tab bar on phones, with Community raised in the middle. */
export function MobileNav() {
  const unread = useUnread()
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-sidebar/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex h-[60px] max-w-md items-stretch px-2">
        <NavLink to="/" end className={tab}>
          <Home size={22} />
          Home
        </NavLink>
        <NavLink to="/explore" className={tab}>
          <Compass size={22} />
          Explore
        </NavLink>
        <NavLink to="/community" className="flex flex-1 flex-col items-center" aria-label="Community">
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  '-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-bg shadow-lg transition-colors',
                  isActive ? 'bg-accent text-accent-ink' : 'bg-accent/90 text-accent-ink',
                )}
              >
                <MessagesSquare size={22} />
              </span>
              <span className={cn('mt-0.5 text-[11px] font-medium', isActive ? 'text-accent' : 'text-text-muted')}>Community</span>
            </>
          )}
        </NavLink>
        <NavLink to="/messages" className={tab}>
          <span className="relative">
            <Mail size={22} />
            <Dot n={unread.dms} />
          </span>
          Messages
        </NavLink>
        <NavLink to="/profile" className={tab}>
          <User size={22} />
          Profile
        </NavLink>
      </div>
    </nav>
  )
}

/** Floating "new project" button, bottom-right on phones. */
export function CreateFab() {
  return (
    <Link
      to="/projects/new"
      aria-label="Create a project"
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_8px_30px_rgba(212,247,92,0.25)] transition-transform active:scale-95 lg:hidden"
    >
      <Plus size={26} strokeWidth={2.5} />
    </Link>
  )
}
