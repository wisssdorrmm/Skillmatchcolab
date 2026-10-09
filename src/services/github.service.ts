// Pull open-source projects that are asking for contributors from GitHub's public search API.
// Runs in the admin's browser (no token needed; GitHub allows ~10 searches a minute).

export interface GithubRepo {
  full_name: string
  name: string
  owner: { login: string }
  description: string | null
  html_url: string
  homepage: string | null
  stargazers_count: number
  language: string | null
  topics?: string[]
  fork: boolean
  archived: boolean
}

/** Shape expected by the admin_import_projects database function. */
export interface GithubImportItem {
  t: string
  d: string
  u: string
  o: string
  s: number
  l: string | null
  c: string
  k: string[]
  r: string[]
  h: string | null
}

export interface GithubSearch {
  language: string
  topic: string
  minStars: number
  signal: 'help-wanted-issues' | 'good-first-issues'
}

export async function searchGithub({ language, topic, minStars, signal }: GithubSearch): Promise<GithubRepo[]> {
  const since = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const parts = [`${signal}:>2`, `stars:>${Math.max(0, minStars)}`, `pushed:>${since}`, 'archived:false', 'fork:false']
  if (language) parts.push(`language:"${language}"`)
  if (topic.trim()) parts.push(`topic:${topic.trim().toLowerCase().replace(/\s+/g, '-')}`)
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(parts.join(' '))}&sort=${signal}&order=desc&per_page=30`
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
  if (res.status === 403 || res.status === 429) throw new Error('GitHub rate limit reached. Wait a minute and try again.')
  if (!res.ok) throw new Error(`GitHub search failed (${res.status}).`)
  const json = (await res.json()) as { items: GithubRepo[] }
  return json.items.filter((r) => !r.fork && !r.archived && r.description)
}

const has = (r: GithubRepo, ...topics: string[]) => topics.some((t) => (r.topics ?? []).includes(t))

export function categoryFor(r: GithubRepo): string {
  const d = `${r.description ?? ''} ${(r.topics ?? []).join(' ')}`.toLowerCase()
  if (has(r, 'llm', 'ai', 'machine-learning', 'deep-learning', 'agents', 'rag', 'pytorch') || /\b(llm|machine learning|agent|model)/.test(d)) return 'AI & ML'
  if (has(r, 'web3', 'ethereum', 'blockchain', 'solidity', 'nostr') || /web3|ethereum|blockchain|smart contract|wallet/.test(d)) return 'Web3'
  if (has(r, 'fintech', 'finance', 'payments') || /payment|finance|trading|invest/.test(d)) return 'Fintech'
  if (has(r, 'healthcare', 'health', 'medical') || /health|medical|clinical/.test(d)) return 'Health'
  if (has(r, 'education', 'learning') || /learn|education|course|teach/.test(d)) return 'Education'
  if (has(r, 'game', 'gamedev', 'game-engine') || /\bgame|engine/.test(d)) return 'Games'
  if (has(r, 'security') || /security|secrets|password|encrypt/.test(d)) return 'Security'
  if (has(r, 'android', 'ios', 'flutter', 'react-native', 'mobile') || /android|\bios\b|flutter|mobile/.test(d)) return 'Mobile'
  if (has(r, 'kubernetes', 'devops', 'docker', 'observability') || /kubernetes|cloud|proxy|monitor|container|database/.test(d)) return 'DevOps & Cloud'
  if (has(r, 'design-system', 'ui') || /ui toolkit|design|component/.test(d)) return 'Design & UI'
  return 'Developer Tools'
}

export function rolesFor(r: GithubRepo, category: string): string[] {
  const L = r.language ?? ''
  const out: string[] = []
  if (category === 'Mobile') out.push('Mobile Developer')
  if (category === 'AI & ML') out.push('AI/ML Engineer')
  if (category === 'Web3') out.push('Smart Contract Developer')
  if (category === 'Games') out.push('Game Developer')
  if (category === 'Design & UI') out.push('Frontend Developer', 'UI/UX Designer')
  else if (['TypeScript', 'JavaScript', 'Vue', 'Svelte', 'HTML', 'CSS'].includes(L)) out.push('Frontend Developer')
  if (['Python', 'Go', 'Ruby', 'PHP', 'Elixir', 'Java', 'C#', 'Scala', 'Kotlin'].includes(L)) out.push('Backend Developer')
  if (['Rust', 'C++', 'C'].includes(L)) out.push('Systems Engineer')
  if (category === 'DevOps & Cloud') out.push('DevOps Engineer')
  if (category === 'Security') out.push('Security Engineer')
  if (!out.length) out.push('Software Engineer')
  return [...new Set(out)].slice(0, 3)
}

const NOISE_TOPICS = new Set(['hacktoberfest', 'good-first-issue', 'help-wanted', 'open-source', 'opensource'])

export function toImportItem(r: GithubRepo): GithubImportItem {
  const c = categoryFor(r)
  const stack = [r.language, ...(r.topics ?? []).filter((t) => !NOISE_TOPICS.has(t) && !t.startsWith('hacktoberfest'))].filter(Boolean) as string[]
  const desc = (r.description ?? '').replace(/:[a-z_]+:/g, '').replace(/\s+/g, ' ').trim()
  return {
    t: r.name,
    d: desc.length > 280 ? `${desc.slice(0, 277).trimEnd()}…` : desc,
    u: r.html_url,
    o: r.owner.login,
    s: r.stargazers_count,
    l: r.language,
    c,
    k: stack.filter((x, i) => stack.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i).slice(0, 6),
    r: rolesFor(r, c),
    h: r.homepage && /^https?:\/\//.test(r.homepage) ? r.homepage : null,
  }
}
