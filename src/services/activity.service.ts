import { supabase } from '../lib/supabase'

export type ActivityKind = 'application' | 'membership'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  projectId: string
  projectTitle: string
  status?: string
  timestamp: string
}

export async function getMyActivity(userId: string, limit = 5): Promise<ActivityItem[]> {
  const [applicationsRes, membershipsRes] = await Promise.all([
    supabase
      .from('applications')
      .select('id, status, created_at, project_id, projects(id, title)')
      .eq('applicant_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('project_members')
      .select('project_id, joined_at, role, projects(id, title, owner_id)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .limit(limit),
  ])

  if (applicationsRes.error) throw applicationsRes.error
  if (membershipsRes.error) throw membershipsRes.error

  const applicationItems: ActivityItem[] = (applicationsRes.data ?? [])
    .filter((a: any) => a.projects)
    .map((a: any) => ({
      id: `application-${a.id}`,
      kind: 'application',
      projectId: a.project_id,
      projectTitle: a.projects.title,
      status: a.status,
      timestamp: a.created_at,
    }))

  const membershipItems: ActivityItem[] = (membershipsRes.data ?? [])
    // Exclude the owner's own "Owner" auto-membership row created at project creation —
    // that's not a meaningful activity event, it's just bookkeeping.
    .filter((m: any) => m.projects && m.projects.owner_id !== userId)
    .map((m: any) => ({
      id: `membership-${m.project_id}`,
      kind: 'membership',
      projectId: m.project_id,
      projectTitle: m.projects.title,
      timestamp: m.joined_at,
    }))

  return [...applicationItems, ...membershipItems]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
}
