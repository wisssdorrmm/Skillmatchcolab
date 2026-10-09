export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'
export type ProjectStatus = 'open' | 'in_progress' | 'closed'
export type ProjectStage = 'idea' | 'building' | 'beta' | 'launched'
export type ProjectSource = 'community' | 'github'
export type FundingStatus = 'submitted' | 'under_review' | 'approved' | 'rejected'

export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  bio: string | null
  primary_role: string | null
  goal: string | null
  created_at: string
  username: string | null
  experience_level: string | null
  interests: string[]
  availability: string | null
  country: string | null
  referral_source: string | null
  github_url: string | null
  x_handle: string | null
  website_url: string | null
  onboarded_at: string | null
  last_seen_at: string | null
  show_online: boolean
}

export type ProfileLite = Pick<Profile, 'id' | 'name' | 'avatar_url'> &
  Partial<Pick<Profile, 'username' | 'primary_role' | 'last_seen_at' | 'show_online'>>

export interface Skill {
  id: number
  name: string
}

export interface Project {
  id: string
  owner_id: string | null
  title: string
  tagline: string | null
  description: string | null
  status: ProjectStatus | null
  stage: ProjectStage
  category: string | null
  tech_stack: string[]
  repo_url: string | null
  demo_url: string | null
  source: ProjectSource
  external_url: string | null
  external_owner: string | null
  external_stars: number | null
  external_language: string | null
  is_featured: boolean
  progress: number
  created_at: string
  updated_at: string
}

export interface ProjectRoleNeeded {
  id: number
  project_id: string
  role_name: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role: string | null
  joined_at: string
}

export interface Milestone {
  id: string
  project_id: string
  title: string
  description: string | null
  weight: number
  position: number
  is_done: boolean
  done_at: string | null
  done_by: string | null
  created_at: string
}

export interface Application {
  id: string
  project_id: string
  applicant_id: string
  message: string | null
  status: ApplicationStatus
  created_at: string
}

export interface Message {
  id: string
  project_id: string
  sender_id: string
  text: string
  created_at: string
}

export interface CommunityRoom {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  is_locked: boolean
  position: number
  message_count?: number
  last_message_at?: string | null
  unread?: number
}

export interface CommunityMessage {
  id: string
  room_id: string
  user_id: string
  body: string
  reply_to: string | null
  created_at: string
  author: ProfileLite | null
  likes: { user_id: string }[]
  reply: { id: string; body: string; author: { name: string | null } | null } | null
}

export interface ConversationSummary {
  id: string
  other_id: string
  other_name: string | null
  other_avatar: string | null
  other_username: string | null
  other_role: string | null
  other_last_seen: string | null
  last_body: string | null
  last_sender: string | null
  last_message_at: string
  unread: number
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
}

export interface FundingProgram {
  id: string
  slug: string | null
  name: string
  provider: string
  description: string | null
  amount_text: string | null
  url: string | null
  tags: string[]
  region: string
  is_internal: boolean
  is_active: boolean
  position: number
}

export interface FundingApplication {
  id: string
  user_id: string
  program_id: string | null
  project_id: string | null
  project_name: string
  amount_requested: number
  pitch: string
  use_of_funds: string
  traction: string | null
  team: string | null
  links: string | null
  contact_email: string | null
  status: FundingStatus
  admin_note: string | null
  reviewed_at: string | null
  created_at: string
  program?: { name: string; provider: string } | null
  applicant?: ProfileLite | null
}

export interface UserStats {
  xp: number
  level: number
  level_floor_xp: number
  next_level_xp: number
  rank: number
  projects: number
  steps: number
  teams: number
  posts: number
  hypes: number
  active_days: number
  current_streak: number
  best_streak: number
  active_today: boolean
}

export interface LeaderboardRow {
  user_id: string
  name: string | null
  avatar_url: string | null
  username: string | null
  primary_role: string | null
  xp: number
  projects: number
  steps: number
  rank: number
}

export interface PlatformStats {
  builders: number
  projects: number
  community_projects: number
  steps_shipped: number
  online: number
}

export interface AppNotification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  project_id: string | null
  link: string | null
  is_read: boolean
  created_at: string
}
