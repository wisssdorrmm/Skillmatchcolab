import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Privacy() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg px-6 py-6">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">Privacy Policy</h1>
      </div>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-text-secondary">
        <p className="text-xs text-text-muted">Last updated: {new Date().toLocaleDateString()}</p>
        <p>
          We collect the information you provide directly: your name, email, profile photo, bio,
          skills, and the content of projects, applications, and messages you create.
        </p>
        <p>
          Your profile, project listings, and skills are visible to other users of the platform
          by design, since discovery and collaboration is the core purpose of SkillMatch Hub.
          Messages and application details are only visible to the people directly involved in
          that conversation or application.
        </p>
        <p>
          We use Supabase to store and secure your data, with row-level security restricting
          access to only what each user is authorized to see.
        </p>
        <p>
          You can request deletion of your account and associated data at any time from your
          Profile settings. We'll process deletion requests and remove your data accordingly.
        </p>
        <p className="text-xs text-text-muted">
          This is placeholder legal text — replace with reviewed policy before public launch.
        </p>
      </div>
    </div>
  )
}
