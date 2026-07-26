export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'
export type ProjectStatus = 'open' | 'in_progress' | 'closed'

export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  bio: string | null
  primary_role: string | null
  goal: string | null
  created_at: string
}

export interface Skill {
  id: number
  name: string
}

export interface UserSkill {
  user_id: string
  skill_id: number
}

export interface Project {
  id: string
  owner_id: string
  title: string
  description: string | null
  status: ProjectStatus | null
  created_at: string
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

// Supabase-js generic Database shape (minimal — extend as needed for RPC/views)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> }
      skills: { Row: Skill; Insert: Partial<Skill>; Update: Partial<Skill> }
      user_skills: { Row: UserSkill; Insert: UserSkill; Update: Partial<UserSkill> }
      projects: { Row: Project; Insert: Partial<Project> & { owner_id: string; title: string }; Update: Partial<Project> }
      project_roles_needed: { Row: ProjectRoleNeeded; Insert: Partial<ProjectRoleNeeded> & { project_id: string; role_name: string }; Update: Partial<ProjectRoleNeeded> }
      project_members: { Row: ProjectMember; Insert: ProjectMember; Update: Partial<ProjectMember> }
      applications: { Row: Application; Insert: Partial<Application> & { project_id: string; applicant_id: string }; Update: Partial<Application> }
      messages: { Row: Message; Insert: Partial<Message> & { project_id: string; sender_id: string; text: string }; Update: Partial<Message> }
    }
  }
}

// Convenience composite types used across the app
export interface ProjectWithOwner extends Project {
  owner: Pick<Profile, 'id' | 'name' | 'avatar_url'> | null
  roles_needed: ProjectRoleNeeded[]
}

export interface ApplicationWithApplicant extends Application {
  applicant: Profile | null
}

export interface MessageWithSender extends Message {
  sender: Pick<Profile, 'id' | 'name' | 'avatar_url'> | null
}
