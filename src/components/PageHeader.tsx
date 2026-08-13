import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Lightweight header for pages outside Home/Explore that still need a quick
// way back to Profile now that it's no longer in the bottom nav.
export default function PageHeader({ title }: { title: string }) {
  const { profile } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="mb-5 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      <button
        onClick={() => navigate('/profile')}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-white"
        aria-label="Profile"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          (profile?.name ?? 'U')
            .split(' ')
            .map((p) => p.charAt(0))
            .join('')
            .slice(0, 2)
            .toUpperCase()
        )}
      </button>
    </div>
  )
}
