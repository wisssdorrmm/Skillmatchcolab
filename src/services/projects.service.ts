import { supabase } from '../lib/supabase'
import type { Project, ProjectRoleNeeded, ProjectStatus } from '../types/database'

export interface ProjectCard extends Project {
  owner: { id: string; name: string | null; avatar_url: string | null } | null
  project_roles_needed: ProjectRoleNeeded[]
}

export async function listProjects(searchTerm = ''): Promise<ProjectCard[]> {
  let query = supabase
    .from('projects')
    .select('*, owner:profiles!owner_id(id, name, avatar_url), project_roles_needed(*)')
    .order('created_at', { ascending: false })

  if (searchTerm.trim()) {
    query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ProjectCard[]
}

export async function getProjectById(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(
      '*, owner:profiles!owner_id(id, name, avatar_url, primary_role), project_roles_needed(*), project_members(user_id, role, joined_at, profiles(id, name, avatar_url))'
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createProject(params: {
  ownerId: string
  title: string
  description: string
  status: ProjectStatus
  roles: string[]
}) {
  const { ownerId, title, description, status, roles } = params

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ owner_id: ownerId, title, description, status })
    .select()
    .single()
  if (error) throw error

  if (roles.length > 0) {
    const { error: rolesErr } = await supabase
      .from('project_roles_needed')
      .insert(roles.map((role_name) => ({ project_id: project.id, role_name })))
    if (rolesErr) throw rolesErr
  }

  // Owner is automatically a member of their own project.
  const { error: memberErr } = await supabase
    .from('project_members')
    .insert({ project_id: project.id, user_id: ownerId, role: 'Owner' })
  if (memberErr) throw memberErr

  return project as Project
}

export async function listMyCreatedProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listMyJoinedProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('projects(*)')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? [])
    .flatMap((r: any) => (r.projects ? [r.projects as Project] : []))
    .filter((p) => p.owner_id !== userId) // "Joined" excludes projects the user owns
}
