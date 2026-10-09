import { Link, NavLink } from 'react-router-dom'
import { Bell, Plus, Settings, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useUnread } from '../../context/UnreadContext'
import { cn } from '../../lib/cn'
import { Logo } from '../Logo'
import { Avatar } from '../ui/Avatar'
import { ButtonLink } from '../ui/Button'
import { MAIN_NAV } from './navItems'

function CountPill({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">
      {n > 99 ? '99+' : n}
    </span>
  )
}

const itemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
    isActive ? 'bg-surface-2 text-text-primary' : 'text-text-secondary hover:bg-surface-2/60 hover:text-text-primary',
  )

/** Fixed left menu on desktop. */
export function Sidebar() {
  const { profile, isAdmin } = useAuth()
  const unread = useUnread()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-border bg-sidebar px-4 pb-4 pt-6 lg:flex">
      <div className="px-2">
        <Logo />
      </div>

      <ButtonLink to="/projects/new" className="mt-6" icon={<Plus size={18} />} fullWidth>
        New project
      </ButtonLink>

      <nav className="mt-5 flex flex-col gap-0.5" aria-label="Main">
        {MAIN_NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} className={itemClass}>
            {({ isActive }) => (
              <>
                <Icon size={20} className={isActive ? 'text-accent' : ''} />
                {label}
                {badge === 'dms' && <CountPill n={unread.dms} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5">
        {isAdmin && (
          <NavLink to="/admin" className={itemClass}>
            <ShieldCheck size={20} />
            Admin
          </NavLink>
        )}
        <NavLink to="/notifications" className={itemClass}>
          {({ isActive }) => (
            <>
              <Bell size={20} className={isActive ? 'text-accent' : ''} />
              Notifications
              <CountPill n={unread.notifications} />
            </>
          )}
        </NavLink>
        <NavLink to="/settings" className={itemClass}>
          {({ isActive }) => (
            <>
              <Settings size={20} className={isActive ? 'text-accent' : ''} />
              Settings
            </>
          )}
        </NavLink>

        <Link to="/profile" className="mt-3 flex items-center gap-3 rounded-xl border-t border-border px-2 pt-4 hover:opacity-90">
          <Avatar name={profile?.name} src={profile?.avatar_url} size="md" seed={profile?.id} />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-text-primary">{profile?.name ?? 'You'}</span>
            <span className="block truncate text-[13px] text-text-secondary">
              {profile?.username ? `@${profile.username}` : (profile?.primary_role ?? 'Builder')}
            </span>
          </span>
        </Link>
      </div>
    </aside>
  )
}
