export interface RoadmapDraft {
  key: string
  id?: string
  title: string
  weight: number | ''
  isDone?: boolean
}

let counter = 0
export const newKey = () => `step-${Date.now().toString(36)}-${counter++}`

export function roadmapTotal(steps: RoadmapDraft[]) {
  return steps.reduce((sum, s) => sum + (typeof s.weight === 'number' ? s.weight : 0), 0)
}

export function roadmapError(steps: RoadmapDraft[]): string | null {
  if (steps.length === 0) return 'Add at least one roadmap step.'
  if (steps.some((s) => !s.title.trim())) return 'Give every step a name.'
  if (steps.some((s) => s.weight === '' || s.weight < 1 || s.weight > 100)) return 'Each step must be worth 1–100%.'
  const total = roadmapTotal(steps)
  if (total !== 100) return `Your steps add up to ${total}%. They need to add up to exactly 100%.`
  return null
}

import type { ProjectFormValues } from '../components/project/ProjectForm'

export const EMPTY_PROJECT: ProjectFormValues = {
  title: '',
  tagline: '',
  description: '',
  category: '',
  stage: 'building',
  open: true,
  roles: [],
  tech: [],
  repo: '',
  demo: '',
  steps: [],
}
