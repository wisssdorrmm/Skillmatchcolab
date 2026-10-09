import { supabase } from '../lib/supabase'
import type { LeaderboardRow, PlatformStats, UserStats } from '../types/database'

export type Period = 'week' | 'month' | 'all'

export async function getUserStats(userId: string): Promise<UserStats> {
  const { data, error } = await supabase.rpc('get_user_stats', { p_user: userId })
  if (error) throw error
  return data as UserStats
}

export async function getLeaderboard(period: Period = 'all', limit = 20): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_period: period, p_limit: limit })
  if (error) throw error
  return (data ?? []) as LeaderboardRow[]
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc('get_platform_stats')
  if (error) throw error
  return data as PlatformStats
}

export async function touchPresence() {
  const { error } = await supabase.rpc('touch_presence')
  if (error) throw error
}

/** Level progress as 0–100 within the current level. */
export function levelProgress(stats: Pick<UserStats, 'xp' | 'level_floor_xp' | 'next_level_xp'>): number {
  const span = stats.next_level_xp - stats.level_floor_xp
  if (span <= 0) return 100
  return Math.round(((stats.xp - stats.level_floor_xp) / span) * 100)
}

export interface Achievement {
  key: string
  label: string
  description: string
  earned: boolean
}

export function achievementsFor(stats: UserStats, shippedProject: boolean): Achievement[] {
  return [
    { key: 'first', label: 'First build', description: 'Post your first project', earned: stats.projects >= 1 },
    { key: 'shipper', label: 'Shipper', description: 'Take a project to 100%', earned: shippedProject },
    { key: 'team', label: 'Team player', description: 'Join another builder’s team', earned: stats.teams >= 1 },
    { key: 'steps', label: 'Momentum', description: 'Finish 10 roadmap steps', earned: stats.steps >= 10 },
    { key: 'streak', label: 'On fire', description: 'Hit a 7-day streak', earned: stats.best_streak >= 7 },
    { key: 'voice', label: 'Community voice', description: 'Post 25 times in the community', earned: stats.posts >= 25 },
    { key: 'hyped', label: 'Hyped', description: 'Get 10 hypes on your projects', earned: stats.hypes >= 10 },
  ]
}
