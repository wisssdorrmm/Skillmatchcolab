import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { FullPageSpinner } from './ui/States'
import { Button } from './ui/Button'

function ProfileErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { signOut } = useAuth()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-text-secondary">
        <WifiOff size={24} />
      </div>
      <h1 className="text-xl font-semibold text-text-primary">We couldn't load your account</h1>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">{message}</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="secondary" onClick={() => signOut()}>
          Log out
        </Button>
      </div>
    </div>
  )
}

/** Signed-in users only. */
export function ProtectedRoute() {
  const { session, loading, profileError, refreshProfile } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (profileError) return <ProfileErrorScreen message={profileError} onRetry={refreshProfile} />
  return <Outlet />
}

/** Everyone answers the onboarding questions once before using the app. */
export function RequireOnboarded() {
  const { profile } = useAuth()
  const location = useLocation()
  if (!profile?.onboarded_at || !profile.name) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

export function AdminRoute() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}

/** Login/signup pages bounce signed-in users into the app. */
export function GuestOnly() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (session) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />
  }
  return <Outlet />
}
