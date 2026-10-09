import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Milestone, Project, ProjectRoleNeeded, ProfileLite } from '../types/database'
import { safeSearchTerm } from './profiles.service'

export interface ProjectCard extends Project {
  owner: Pick<ProfileLite, 'id' | 'name' | 'avatar_url' | 'username' | 'is_verified'> | null
  project_roles_needed: Pick<ProjectRoleNeeded, 'id' | 'role_name'>[]
  project_members: { count: number }[]
  project_upvotes: { count: number }[]
}

export interface ProjectMemberRow {
  user_id: string
  role: string | null
  joined_at: string
  profile: ProfileLite | null
}

export interface ProjectDetail extends Project {
  owner: ProfileLite | null
  project_roles_needed: Pick<ProjectRoleNeeded, 'id' | 'role_name'>[]
  project_members: ProjectMemberRow[]
  project_milestones: Milestone[]
}

const CARD_SELECT =
  '*, owner:profiles!owner_id(id, name, avatar_url, username, is_verified), project_roles_needed(id, role_name), project_members(count), project_upvotes(count)'

export type ProjectSort = 'newest' | 'progress' | 'stars' | 'updated'

export interface ProjectFilters {
  search?: string
  /** 'imported' = everything found outside the app (GitHub repos and other sites) */
  source?: 'community' | 'github' | 'imported'
  category?: string
  /** only projects needing at least one of these roles */
  roles?: string[]
  sort?: ProjectSort
  limit?: number
  offset?: number
  onlyOpen?: boolean
}

export async function listProjects({ search = '', source, category, roles, sort = 'newest', limit = 24, offset = 0, onlyOpen }: ProjectFilters = {}) {
  const select = roles?.length ? CARD_SELECT.replace('project_roles_needed(', 'project_roles_needed!inner(') : CARD_SELECT
  let query = supabase.from('projects').select(select, { count: 'exact' })
  if (roles?.length) query = query.in('project_roles_needed.role_name', roles)
  if (source === 'imported') query = query.neq('source', 'community')
  else if (source) query = query.eq('source', source)
  if (category) query = query.eq('category', category)
  if (onlyOpen) query = query.neq('status', 'closed')
  const q = safeSearchTerm(search)
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,tagline.ilike.%${q}%,external_owner.ilike.%${q}%`)

  if (sort === 'progress') query = query.order('progress', { ascending: false }).order('updated_at', { ascending: false })
  else if (sort === 'stars') query = query.order('external_stars', { ascending: false, nullsFirst: false })
  else if (sort === 'updated') query = query.order('updated_at', { ascending: false })
  else query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false })

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) throw error
  return { items: (data ?? []) as unknown as ProjectCard[], total: count ?? 0 }
}

export async function listProjectsByIds(ids: string[]): Promise<ProjectCard[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('projects').select(CARD_SELECT).in('id', ids)
  if (error) throw error
  return (data ?? []) as unknown as ProjectCard[]
}

export async function getProject(id: string): Promise<ProjectDetail | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(
      '*, owner:profiles!owner_id(id, name, avatar_url, username, primary_role, last_seen_at, show_online, is_verified), project_roles_needed(id, role_name), project_members(user_id, role, joined_at, profile:profiles(id, name, avatar_url, username, primary_role, last_seen_at, show_online, is_verified)), project_milestones(*)',
    )
    .eq('id', id)
    .order('position', { referencedTable: 'project_milestones', ascending: true })
    .maybeSingle()
  if (error) throw error
  return data as unknown as ProjectDetail | null
}

export interface MilestoneInput {
  id?: string
  title: string
  weight: number
  description?: string
}

export interface ProjectInput {
  title: string
  tagline: string
  description: string
  category: string
  stage: string
  status: string
  tech_stack: string[]
  roles: string[]
  repo_url: string
  demo_url: string
  milestones: MilestoneInput[]
}

export async function createProject(input: ProjectInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_project', { p: input })
  if (error) throw error
  return data as string
}

export async function updateProject(id: string, input: ProjectInput) {
  const { error } = await supabase.rpc('update_project', { p_id: id, p: input })
  if (error) throw error
}

export async function deleteProject(id: string) {
  const { error } = await supabase.rpc('delete_project', { p_id: id })
  if (error) throw error
}

export async function setMilestoneDone(milestoneId: string, done: boolean): Promise<number> {
  const { data, error } = await supabase.rpc('set_milestone_done', { p_milestone_id: milestoneId, p_done: done })
  if (error) throw error
  return data as number
}

/** Projects I own plus projects I've joined, newest activity first. */
export async function listMyProjects(userId: string): Promise<{ owned: ProjectCard[]; joined: ProjectCard[] }> {
  const { data: memberRows, error: mErr } = await supabase.from('project_members').select('project_id').eq('user_id', userId)
  if (mErr) throw mErr
  const memberIds = (memberRows ?? []).map((r) => r.project_id as string)

  const [{ data: owned, error: oErr }, joinedAll] = await Promise.all([
    supabase.from('projects').select(CARD_SELECT).eq('owner_id', userId).order('updated_at', { ascending: false }),
    listProjectsByIds(memberIds),
  ])
  if (oErr) throw oErr
  return {
    owned: (owned ?? []) as unknown as ProjectCard[],
    joined: joinedAll.filter((p) => p.owner_id !== userId).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  }
}

export async function hasUpvoted(projectId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('project_upvotes').select('user_id').eq('project_id', projectId).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return !!data
}

export async function countUpvotes(projectId: string): Promise<number> {
  const { count, error } = await supabase.from('project_upvotes').select('user_id', { count: 'exact', head: true }).eq('project_id', projectId)
  if (error) throw error
  return count ?? 0
}

export async function setUpvote(projectId: string, userId: string, on: boolean) {
  if (on) {
    const { error } = await supabase.from('project_upvotes').insert({ project_id: projectId, user_id: userId })
    if (error && error.code !== '23505') throw error
  } else {
    const { error } = await supabase.from('project_upvotes').delete().eq('project_id', projectId).eq('user_id', userId)
    if (error) throw error
  }
}

export interface ShipItem {
  id: string
  title: string
  weight: number
  done_at: string
  project: { id: string; title: string; progress: number } | null
  doer: { id: string; name: string | null; avatar_url: string | null } | null
}

/** Latest roadmap steps finished anywhere on the platform. */
export async function listRecentShips(limit = 8): Promise<ShipItem[]> {
  const { data, error } = await supabase
    .from('project_milestones')
    .select('id, title, weight, done_at, project:projects(id, title, progress), doer:profiles!done_by(id, name, avatar_url)')
    .eq('is_done', true)
    .order('done_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as ShipItem[]
}

export function subscribeToMilestones(projectId: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`milestones:${projectId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'project_milestones', filter: `project_id=eq.${projectId}` }, () => onChange())
    .subscribe()
}

/** Best link for "how do I help": the specific open tasks if we know them, else GitHub's contribute page. */
export function contributeUrl(p: Pick<Project, 'external_contribute_url' | 'external_url' | 'repo_url' | 'source'>): string {
  if (p.external_contribute_url) return p.external_contribute_url
  const repo = p.external_url ?? p.repo_url ?? ''
  return p.source === 'github' && repo ? `${repo.replace(/\/$/, '')}/contribute` : repo
}
