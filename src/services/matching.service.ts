import type { ProjectCard } from './projects.service'

export interface RankedProject extends ProjectCard {
  _matchScore: number
  _matchedOn: string[]
}

const normalize = (s: string) => s.trim().toLowerCase()

/**
 * Deterministic, explainable scoring — no ML, no fake numbers.
 *
 * Weights (highest to lowest):
 *  - Exact primary-role match on a required role   -> 100
 *  - A required role matches one of the user's skills -> 40 each
 *  - Partial/substring match between a skill and a role -> 15 each
 *  - Recency is only used as a tie-breaker, never overrides a real match.
 */
export function scoreProject(
  project: ProjectCard,
  primaryRole: string | null | undefined,
  skillNames: string[]
): { score: number; matchedOn: string[] } {
  const roles = project.project_roles_needed.map((r) => r.role_name)
  const normalizedRoles = roles.map(normalize)
  const normalizedSkills = skillNames.map(normalize)
  const normalizedPrimaryRole = primaryRole ? normalize(primaryRole) : null

  let score = 0
  const matchedOn: string[] = []

  // 1. Primary role exact match
  if (normalizedPrimaryRole) {
    const roleMatchIndex = normalizedRoles.indexOf(normalizedPrimaryRole)
    if (roleMatchIndex !== -1) {
      score += 100
      matchedOn.push(roles[roleMatchIndex])
    }
  }

  // 2 & 3. Role <-> skill matches (exact, then partial)
  normalizedRoles.forEach((role, i) => {
    if (role === normalizedPrimaryRole) return // already scored above

    const exactSkillMatch = normalizedSkills.includes(role)
    if (exactSkillMatch) {
      score += 40
      matchedOn.push(roles[i])
      return
    }

    const partialMatch = normalizedSkills.some(
      (skill) => role.includes(skill) || skill.includes(role)
    )
    if (partialMatch) {
      score += 15
      matchedOn.push(roles[i])
    }
  })

  return { score, matchedOn: Array.from(new Set(matchedOn)) }
}

export function rankProjects(
  projects: ProjectCard[],
  primaryRole: string | null | undefined,
  skillNames: string[]
): RankedProject[] {
  return projects
    .map((project) => {
      const { score, matchedOn } = scoreProject(project, primaryRole, skillNames)
      return { ...project, _matchScore: score, _matchedOn: matchedOn }
    })
    .sort((a, b) => {
      if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore
      // Recency tie-breaker only
      return b.created_at.localeCompare(a.created_at)
    })
}
