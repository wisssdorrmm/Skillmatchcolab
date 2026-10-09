import { Compass, HandCoins, Home, Mail, MessagesSquare, Trophy, User } from 'lucide-react'

export const MAIN_NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/community', label: 'Community', icon: MessagesSquare },
  { to: '/messages', label: 'Messages', icon: Mail, badge: 'dms' as const },
  { to: '/funding', label: 'Funding', icon: HandCoins },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
]

/** Chat screens take the whole phone screen (no top bar / bottom nav). */
export const IMMERSIVE_PATTERNS = [/^\/messages\/[^/]+$/, /^\/community\/[^/]+$/, /^\/chats\/[^/]+$/, /^\/project\/[^/]+\/messages\/[^/]+$/]

export function isImmersive(pathname: string) {
  return IMMERSIVE_PATTERNS.some((re) => re.test(pathname))
}

export function hideFab(pathname: string) {
  return isImmersive(pathname) || pathname.startsWith('/projects/new') || /\/edit$/.test(pathname) || pathname.startsWith('/funding/apply')
}
