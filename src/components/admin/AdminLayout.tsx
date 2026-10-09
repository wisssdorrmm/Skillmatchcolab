import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Activity, ArrowLeft, BarChart3, DownloadCloud, FolderKanban, HandCoins, LayoutDashboard, Megaphone, MessagesSquare, ShieldCheck, Users } from 'lucide-react'
import { cn } from '../../lib/cn'
import { usePresence } from '../../hooks/usePresence'
import { LogoMark } from '../Logo'
import { BRAND } from '../../config/brand'
import { InPageSpinner } from '../ui/States'

const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/activity', label: 'Live activity', icon: Activity },
  { to: '/admin/insights', label: 'Insights', icon: BarChart3 },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { to: '/admin/import', label: 'Import projects', icon: DownloadCloud },
  { to: '/admin/funding', label: 'Funding', icon: HandCoins },
  { to: '/admin/community', label: 'Community', icon: MessagesSquare },
  { to: '/admin/broadcast', label: 'Broadcast', icon: Megaphone },
  { to: '/admin/admins', label: 'Admins', icon: ShieldCheck },
]

export function AdminLayout() {
  usePresence(true)
  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] flex-col border-r border-border bg-sidebar px-4 pb-4 pt-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <LogoMark />
          <span className="text-lg font-bold tracking-tight text-text-primary">{BRAND.name}</span>
          <span className="text-sm text-text-secondary">admin</span>
        </div>
        <NavLink to="/" className="mt-5 flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft size={16} /> Back to the app
        </NavLink>
        <nav className="mt-4 flex flex-col gap-0.5" aria-label="Admin">
          {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors',
                  isActive ? 'bg-surface-2 text-text-primary' : 'text-text-secondary hover:bg-surface-2/60 hover:text-text-primary',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-[248px]">
        <div className="sticky top-0 z-30 border-b border-border bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <NavLink to="/" aria-label="Back to the app" className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-2">
              <ArrowLeft size={20} />
            </NavLink>
            <span className="font-bold text-text-primary">Admin</span>
          </div>
          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Admin">
            {ADMIN_NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn('h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium leading-9', isActive ? 'bg-accent text-accent-ink' : 'bg-surface text-text-secondary')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <Suspense fallback={<InPageSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
