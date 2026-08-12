import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Terms() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg px-6 py-6">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">Terms of Service</h1>
      </div>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-text-secondary">
        <p className="text-xs text-text-muted">Last updated: {new Date().toLocaleDateString()}</p>
        <p>
          By creating an account on SkillMatch Hub, you agree to use the platform to discover,
          create, and collaborate on projects in good faith. You're responsible for the accuracy
          of the information in your profile and the content you post in project listings,
          applications, and messages.
        </p>
        <p>
          Project owners are responsible for the projects they create and the commitments they
          make to team members. SkillMatch Hub is a discovery and communication tool — it does
          not guarantee project outcomes, quality of collaboration, or payment between users.
        </p>
        <p>
          You agree not to use the platform to post spam, harassment, or fraudulent project
          listings. Accounts found violating this may have access restricted.
        </p>
        <p>
          We may update these terms as the platform evolves. Continued use after changes means
          you accept the updated terms.
        </p>
        <p className="text-xs text-text-muted">
          This is placeholder legal text — replace with reviewed terms before public launch.
        </p>
      </div>
    </div>
  )
}
