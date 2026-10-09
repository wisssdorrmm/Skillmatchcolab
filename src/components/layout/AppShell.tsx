import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePresence } from '../../hooks/usePresence'
import { cn } from '../../lib/cn'
import { Sidebar } from './Sidebar'
import { CreateFab, MobileNav, MobileTopBar } from './MobileNav'
import { RightRail } from './RightRail'
import { hideFab, isImmersive } from './navItems'
import { InPageSpinner } from '../ui/States'

export function AppShell() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const immersive = isImmersive(pathname)
  usePresence(!!user)

  useEffect(() => {
    if (!immersive) window.scrollTo(0, 0)
  }, [pathname, immersive])

  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar />
      <div className="lg:pl-[264px]">
        {!immersive && <MobileTopBar />}
        <div className="mx-auto flex max-w-[1180px] justify-center gap-10 px-4 sm:px-6 lg:px-10">
          <main className={cn('min-w-0 w-full max-w-[760px] flex-1', immersive ? 'lg:py-0' : 'pb-36 pt-5 sm:pt-6 lg:pb-16 lg:pt-10')}>
            <Suspense fallback={<InPageSpinner />}>
              <Outlet />
            </Suspense>
          </main>
          <RightRail />
        </div>
      </div>
      {!immersive && <MobileNav />}
      {!hideFab(pathname) && <CreateFab />}
    </div>
  )
}
