import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// A profile counts as "set up" once primary_role has been filled in.
// (No dedicated onboarding_complete column exists — this avoids a schema change.)
export default function RequireProfile() {
  const { profile, profileLoading } = useAuth()
  const location = useLocation()

  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-text-secondary">
        Loading…
      </div>
    )
  }

  const isSetupComplete = !!profile?.primary_role

  if (!isSetupComplete && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />
  }

  return <Outlet />
}
