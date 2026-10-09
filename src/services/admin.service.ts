import { supabase } from '../lib/supabase'
import type { CommunityRoom, FundingApplication, FundingProgram, FundingStatus } from '../types/database'
import type { GithubImportItem } from './github.service'

export interface AdminOverview {
  members_total: number
  members_onboarded: number
  members_new_7d: number
  members_new_30d: number
  members_prev_30d: number
  online_now: number
  dau: number
  wau: number
  mau: number
  admins: number
  projects_total: number
  projects_community: number
  projects_github: number
  projects_new_7d: number
  projects_completed: number
  avg_progress: number
  steps_done_7d: number
  posts_7d: number
  dms_7d: number
  applications_pending: number
  funding_pending: number
  funding_total: number
  funding_requested: number
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc('admin_overview')
  if (error) throw error
  return data as AdminOverview
}

export interface GrowthPoint {
  day: string
  joins: number
  total: number
}

export async function getMemberGrowth(days: number | null): Promise<GrowthPoint[]> {
  const { data, error } = await supabase.rpc('admin_member_growth', { p_days: days })
  if (error) throw error
  return (data ?? []) as GrowthPoint[]
}

export async function getActiveSeries(days: number | null): Promise<{ day: string; active: number }[]> {
  const { data, error } = await supabase.rpc('admin_active_series', { p_days: days })
  if (error) throw error
  return (data ?? []) as { day: string; active: number }[]
}

export interface AdminMember {
  id: string
  name: string | null
  username: string | null
  email: string | null
  avatar_url: string | null
  primary_role: string | null
  experience_level: string | null
  availability: string | null
  country: string | null
  referral_source: string | null
  interests: string[] | null
  created_at: string
  last_seen_at: string | null
  last_sign_in_at: string | null
  onboarded_at: string | null
  is_admin: boolean
  projects: number
  total_count: number
}

export async function listMembers(search: string, limit = 50, offset = 0): Promise<AdminMember[]> {
  const { data, error } = await supabase.rpc('admin_list_members', { p_search: search || null, p_limit: limit, p_offset: offset })
  if (error) throw error
  return (data ?? []) as AdminMember[]
}

export async function setAdmin(userId: string, makeAdmin: boolean) {
  const { error } = await supabase.rpc('admin_set_admin', { p_user: userId, p_make: makeAdmin })
  if (error) throw error
}

export async function addAdminByEmail(email: string) {
  const { error } = await supabase.rpc('admin_add_admin_by_email', { p_email: email })
  if (error) throw error
}

export interface AdminRow {
  user_id: string
  created_at: string
  profile: { id: string; name: string | null; avatar_url: string | null; username: string | null; last_seen_at: string | null } | null
}

export async function listAdmins(): Promise<AdminRow[]> {
  const { data, error } = await supabase
    .from('app_admins')
    .select('user_id, created_at, profile:profiles!user_id(id, name, avatar_url, username, last_seen_at)')
    .order('created_at')
  if (error) throw error
  return (data ?? []) as unknown as AdminRow[]
}

export interface Breakdown {
  label: string
  count: number
}

export interface AdminInsights {
  total: number
  onboarded: number
  roles: Breakdown[]
  experience: Breakdown[]
  availability: Breakdown[]
  countries: Breakdown[]
  referral: Breakdown[]
  interests: Breakdown[]
  skills: Breakdown[]
  categories: Breakdown[]
}

export async function getInsights(): Promise<AdminInsights> {
  const { data, error } = await supabase.rpc('admin_insights')
  if (error) throw error
  return data as AdminInsights
}

export interface ActivityEvent {
  kind: 'signup' | 'project' | 'step' | 'team' | 'post' | 'funding'
  actor_id: string | null
  actor_name: string | null
  actor_avatar: string | null
  summary: string
  link: string | null
  at: string
}

export async function getRecentActivity(limit = 40): Promise<ActivityEvent[]> {
  const { data, error } = await supabase.rpc('admin_recent_activity', { p_limit: limit })
  if (error) throw error
  return (data ?? []) as ActivityEvent[]
}

export async function setFeatured(projectId: string, featured: boolean) {
  const { error } = await supabase.rpc('admin_set_featured', { p_project: projectId, p_featured: featured })
  if (error) throw error
}

export async function listAllFunding(status?: FundingStatus | 'open'): Promise<FundingApplication[]> {
  let query = supabase
    .from('funding_applications')
    .select('*, program:funding_programs(name, provider), applicant:profiles!user_id(id, name, avatar_url, username)')
    .order('created_at', { ascending: false })
  if (status === 'open') query = query.in('status', ['submitted', 'under_review'])
  else if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as FundingApplication[]
}

export async function reviewFunding(id: string, status: FundingStatus, note: string) {
  const { error } = await supabase.rpc('admin_review_funding', { p_id: id, p_status: status, p_note: note })
  if (error) throw error
}

export async function saveFundingProgram(program: Partial<FundingProgram> & { name: string; provider: string }) {
  const row = {
    name: program.name,
    provider: program.provider,
    description: program.description ?? null,
    amount_text: program.amount_text ?? null,
    url: program.url || null,
    tags: program.tags ?? [],
    region: program.region || 'Global',
    is_active: program.is_active ?? true,
    position: program.position ?? 50,
  }
  const { error } = program.id
    ? await supabase.from('funding_programs').update(row).eq('id', program.id)
    : await supabase.from('funding_programs').insert(row)
  if (error) throw error
}

export async function sendBroadcast(title: string, body: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_broadcast', { p_title: title, p_body: body })
  if (error) throw error
  return data as number
}

export async function importProjects(items: GithubImportItem[]): Promise<number> {
  const { data, error } = await supabase.rpc('admin_import_projects', { p_items: items })
  if (error) throw error
  return data as number
}

export async function createRoom(room: Pick<CommunityRoom, 'slug' | 'name' | 'description' | 'category' | 'is_locked'>) {
  const { error } = await supabase.from('community_rooms').insert({ ...room, position: 100 })
  if (error) throw error
}

export async function deleteRoom(id: string) {
  const { error } = await supabase.from('community_rooms').delete().eq('id', id)
  if (error) throw error
}

export async function updateRoom(id: string, patch: Partial<Pick<CommunityRoom, 'is_locked' | 'description' | 'name'>>) {
  const { error } = await supabase.from('community_rooms').update(patch).eq('id', id)
  if (error) throw error
}
