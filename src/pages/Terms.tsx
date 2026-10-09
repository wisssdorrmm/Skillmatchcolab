import { BRAND } from '../config/brand'
import { SimplePage } from '../components/layout/SimplePage'

export default function Terms() {
  return (
    <SimplePage title="Terms of Service">
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-text-secondary">
        <p>
          By creating an account on {BRAND.name}, you agree to use the platform to discover, create and collaborate on projects in good faith. You're
          responsible for the accuracy of your profile and the content you post in projects, roadmaps, applications, community rooms and messages.
        </p>
        <p>
          Project owners are responsible for the projects they create and the commitments they make to teammates. {BRAND.name} is a discovery and
          communication tool — it does not guarantee project outcomes, the quality of collaboration, or payment between members.
        </p>
        <p>
          Funding applications are reviewed by the {BRAND.name} team. Submitting one does not guarantee funding. External programs listed in the app are
          run by their own organisations under their own rules.
        </p>
        <p>
          Open-source projects imported from GitHub belong to their maintainers. {BRAND.name} links to them to help people find ways to contribute.
        </p>
        <p>You agree not to post spam, harassment or fraudulent listings. Accounts that do may be restricted or removed.</p>
        <p>We may update these terms as the platform evolves. Continued use after changes means you accept the updated terms.</p>
        <p className="text-xs text-text-muted">Placeholder legal text — replace with reviewed terms before public launch.</p>
      </div>
    </SimplePage>
  )
}
