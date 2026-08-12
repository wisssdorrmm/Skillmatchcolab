import { NavLink, Outlet } from 'react-router-dom'
import { Home, Compass, MessageCircle } from 'lucide-react'

// Profile is intentionally not in the bottom nav — reachable via the avatar
// button in the Home/Explore header instead, so it's not duplicated.
const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/chats', label: 'Chat', icon: MessageCircle },
]

export default function AppLayout() {
  return (
    // h-dvh (dynamic viewport height), not h-screen — h-screen uses the
    // *largest possible* viewport, so when a mobile browser's address bar
    // collapses/expands on scroll, content shifts and the nav appears to
    // jump or vanish. dvh tracks the actual visible viewport instead.
    <div className="flex h-dvh flex-col bg-bg">
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </main>

      <nav className="flex shrink-0 justify-around border-t border-border bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg px-6 py-1.5 text-xs font-medium transition-colors ${
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
