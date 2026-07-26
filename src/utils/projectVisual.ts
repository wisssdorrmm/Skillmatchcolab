import {
  Sparkles,
  Utensils,
  Boxes,
  Dumbbell,
  Rocket,
  Palette,
  Code2,
  ShoppingBag,
  Music,
  Camera,
  type LucideIcon,
} from 'lucide-react'

// There's no "category" or "icon" column on projects — this is a purely
// visual, deterministic assignment (hashed from the project id) so each
// project consistently gets the same icon/color across sessions, without
// inventing or storing fake category data.
const PALETTE: { icon: LucideIcon; bg: string; fg: string }[] = [
  { icon: Sparkles, bg: '#3F2E7A', fg: '#C4B5FD' },
  { icon: Utensils, bg: '#1F5138', fg: '#86EFAC' },
  { icon: Boxes, bg: '#1E3A6E', fg: '#93C5FD' },
  { icon: Dumbbell, bg: '#7A3B12', fg: '#FDBA74' },
  { icon: Rocket, bg: '#5B1E3A', fg: '#F9A8D4' },
  { icon: Palette, bg: '#1F4E4E', fg: '#7DD3FC' },
  { icon: Code2, bg: '#3A3A1F', fg: '#FDE68A' },
  { icon: ShoppingBag, bg: '#4A1F4E', fg: '#E9A8FD' },
  { icon: Music, bg: '#1F3A3A', fg: '#5EEAD4' },
  { icon: Camera, bg: '#3A1F2E', fg: '#FCA5A5' },
]

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getProjectVisual(projectId: string) {
  const index = hashString(projectId) % PALETTE.length
  return PALETTE[index]
}
