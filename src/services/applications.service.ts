import { supabase } from '../lib/supabase'
import type { Application, ApplicationStatus } from '../types/database'

export async function applyToProject(projectId: string, applicantId: string, message: string) {
  const { error } = await supabase
    .from('applications')
    .insert({ project_id: projectId, applicant_id: applicantId, message, status: 'pending' })
  if (error) throw error
}

export async function getMyApplication(projectId: string, userId: string): Promise<Application | null> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('project_id', projectId)
    .eq('applicant_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function withdrawApplication(applicationId: string) {
  const { error } = await supabase.from('applications').delete().eq('id', applicationId)
  if (error) throw error
}

export async function listApplicationsForProject(projectId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select('*, applicant:profiles!applicant_id(id, name, avatar_url, primary_role, bio)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus) {
  const { error } = await supabase.from('applications').update({ status }).eq('id', applicationId)
  if (error) throw error
}

// Accept = update status + add to project_members in one flow.
export async function acceptApplication(application: Application) {
  await updateApplicationStatus(application.id, 'accepted')

  const { error } = await supabase.from('project_members').insert({
    project_id: application.project_id,
    user_id: application.applicant_id,
    role: 'Member',
  })
  // Ignore duplicate-member errors (e.g. re-accepting) but surface anything else.
  if (error && error.code !== '23505') throw error
}

export async function rejectApplication(applicationId: string) {
  await updateApplicationStatus(applicationId, 'rejected')
}
