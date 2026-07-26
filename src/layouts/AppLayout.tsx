import { NavLink, Outlet } from 'react-router-dom'
import { Home, Compass, MessageCircle, User } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/chats', label: 'Chat', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-bg">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <nav className="flex justify-around border-t border-border bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
              }`
            }
          >
            <Icon size={21} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
