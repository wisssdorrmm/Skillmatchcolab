import { supabase } from '../lib/supabase'
import type { FundingApplication, FundingProgram } from '../types/database'

export async function listFundingPrograms(includeInactive = false): Promise<FundingProgram[]> {
  let query = supabase.from('funding_programs').select('*').order('position').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as FundingProgram[]
}

export async function listMyFundingApplications(userId: string): Promise<FundingApplication[]> {
  const { data, error } = await supabase
    .from('funding_applications')
    .select('*, program:funding_programs(name, provider)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as FundingApplication[]
}

export interface FundingInput {
  program_id: string | null
  project_id: string | null
  project_name: string
  amount_requested: number
  pitch: string
  use_of_funds: string
  traction: string
  team: string
  links: string
  contact_email: string
}

export async function applyForFunding(userId: string, input: FundingInput) {
  const { error } = await supabase.from('funding_applications').insert({
    user_id: userId,
    ...input,
    traction: input.traction || null,
    team: input.team || null,
    links: input.links || null,
    contact_email: input.contact_email || null,
  })
  if (error) throw error
}

export async function withdrawFundingApplication(id: string) {
  const { error } = await supabase.from('funding_applications').delete().eq('id', id)
  if (error) throw error
}

export const FUNDING_STATUS: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' | 'danger' }> = {
  submitted: { label: 'Submitted', tone: 'neutral' },
  under_review: { label: 'Under review', tone: 'info' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Not approved', tone: 'danger' },
}
