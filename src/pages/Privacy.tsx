import { BRAND } from '../config/brand'
import { SimplePage } from '../components/layout/SimplePage'

export default function Privacy() {
  return (
    <SimplePage title="Privacy Policy">
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-text-secondary">
        <p>
          We collect what you give us: your email, name, username, photo, bio, role, skills, links, and your onboarding answers (experience,
          availability, country, what you're here for and how you heard about us). We also store the projects, roadmaps, posts, applications,
          funding applications and messages you create.
        </p>
        <p>
          To run the community and understand how {BRAND.name} is used, we record when you were last active and which days you used the app. You can
          hide your online status from other members in Settings.
        </p>
        <p>
          Profiles, projects, roadmaps and community posts are visible to other signed-in members by design. Direct messages, team chats,
          applications and funding applications are only visible to the people involved and to {BRAND.name} admins where needed for moderation and
          review.
        </p>
        <p>Your data is stored with Supabase, with row-level security limiting each person to what they're allowed to see.</p>
        <p>You can request deletion of your account at any time from Settings → Deactivate account.</p>
        <p className="text-xs text-text-muted">Placeholder legal text — replace with a reviewed policy before public launch.</p>
      </div>
    </SimplePage>
  )
}
