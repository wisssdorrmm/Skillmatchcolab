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
  /** direct link to the open tasks for the role we found them for */
  x?: string | null
}

/**
 * Non-code help: GitHub task labels that clearly mean "we need this kind of person".
 * Ambiguous labels (plain "design", "testing", "video", "community") are left out on purpose.
 */
export const FIELD_SEARCHES: Record<string, { label: string; role: string; labels: string }> = {
  design: { label: 'UI / UX designers', role: 'UI/UX Designer', labels: 'ux,"ui/ux","ux/ui",figma,"needs design","design needed","ux design","ui design"' },
  graphic: { label: 'Graphic designers', role: 'Graphic Designer', labels: 'logo,branding,"graphic design",artwork,illustration' },
  docs: { label: 'Technical writers', role: 'Technical Writer', labels: 'documentation,docs,tutorial' },
  content: { label: 'Content writers', role: 'Content Writer', labels: 'blog,writing,article,copywriting,"blog post"' },
  translation: { label: 'Translators', role: 'Translator', labels: 'translation,translations,l10n,localization,localisation' },
  marketing: { label: 'Marketing & growth', role: 'Marketing / Growth', labels: 'marketing,"social media",promotion,outreach,seo,advocacy' },
  community: { label: 'Community managers', role: 'Community Manager', labels: '"community management",newsletter,meetup,ambassador' },
  testing: { label: 'Testers (QA)', role: 'QA Tester', labels: 'qa,"needs testing","manual testing","user testing","needs qa"' },
  research: { label: 'UX researchers', role: 'UX Researcher', labels: '"user research","ux research",survey,usability' },
  accessibility: { label: 'Accessibility', role: 'Accessibility Specialist', labels: 'accessibility,a11y' },
}

export type SearchSignal = 'help-wanted-issues' | 'good-first-issues' | keyof typeof FIELD_SEARCHES

export interface GithubSearch {
  language: string
  topic: string
  minStars: number
  signal: SearchSignal
}

export interface GithubResult {
  repo: GithubRepo
  item: GithubImportItem
}

const SPAM = /hacktober|first[-_ ]?contribution|contribute[-_ ]?(here|repo)|^awesome|my[-_ ]?first|practice|template|boilerplate|portfolio/i

async function githubGet<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com/${path}`, { headers: { Accept: 'application/vnd.github+json' } })
  if (res.status === 403 || res.status === 429) throw new Error('GitHub rate limit reached. Wait a minute and try again.')
  if (!res.ok) throw new Error(`GitHub search failed (${res.status}).`)
  return (await res.json()) as T
}

/** Repo details for many repos in a few searches (repo:a/b repo:c/d … stays under GitHub's 256-char query limit). */
async function reposByName(names: string[]): Promise<GithubRepo[]> {
  const out: GithubRepo[] = []
  let batch: string[] = []
  const flush = async () => {
    if (!batch.length) return
    const json = await githubGet<{ items: GithubRepo[] }>(`search/repositories?q=${encodeURIComponent(batch.map((n) => `repo:${n}`).join(' '))}&per_page=100`)
    out.push(...json.items)
    batch = []
  }
  for (const n of names) {
    if ([...batch, n].map((x) => `repo:${x}`).join(' ').length > 240) await flush()
    batch.push(n)
  }
  await flush()
  return out
}

export async function searchGithub({ language, topic, minStars, signal }: GithubSearch): Promise<GithubResult[]> {
  const since = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const field = FIELD_SEARCHES[signal]

  if (!field) {
    const parts = [`${signal}:>2`, `stars:>${Math.max(0, minStars)}`, `pushed:>${since}`, 'archived:false']
    if (language) parts.push(`language:"${language}"`)
    if (topic.trim()) parts.push(`topic:${topic.trim().toLowerCase().replace(/\s+/g, '-')}`)
    const json = await githubGet<{ items: GithubRepo[] }>(`search/repositories?q=${encodeURIComponent(parts.join(' '))}&sort=${signal}&order=desc&per_page=30`)
    return json.items.filter((r) => !r.fork && !r.archived && r.description).map((repo) => ({ repo, item: toImportItem(repo) }))
  }

  // Non-code roles: find open, beginner-friendly tasks with that label, then group them by repo.
  const q = [
    'is:issue is:open archived:false',
    `updated:>${since}`,
    'label:"good first issue","help wanted",hacktoberfest,"up-for-grabs"',
    `label:${field.labels}`,
    language ? `language:"${language}"` : '',
  ].filter(Boolean).join(' ')
  const issues = await githubGet<{ items: { repository_url: string; labels: { name: string }[] }[] }>(`search/issues?q=${encodeURIComponent(q)}&sort=updated&per_page=100`)
  const wanted = field.labels.split(',').map((l) => l.replace(/"/g, '').toLowerCase())
  const byRepo = new Map<string, { count: number; label: string }>()
  for (const it of issues.items) {
    const full = it.repository_url.replace('https://api.github.com/repos/', '')
    const label = it.labels.map((l) => l.name).find((n) => wanted.includes(n.toLowerCase())) ?? wanted[0]
    const prev = byRepo.get(full)
    byRepo.set(full, { count: (prev?.count ?? 0) + 1, label: prev?.label ?? label })
  }
  const top = [...byRepo.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 30).map(([n]) => n)
  const repos = await reposByName(top)
  return repos
    .filter((r) => !r.fork && !r.archived && r.description && r.stargazers_count >= minStars && !SPAM.test(r.name) && !SPAM.test(r.description ?? ''))
    .map((repo) => {
      const base = toImportItem(repo)
      const hit = byRepo.get(repo.full_name) ?? byRepo.get([...byRepo.keys()].find((k) => k.toLowerCase() === repo.full_name.toLowerCase()) ?? '')
      const item: GithubImportItem = {
        ...base,
        r: [...new Set([field.role, ...base.r])].slice(0, 3),
        x: hit ? `${repo.html_url}/issues?q=${encodeURIComponent(`is:issue is:open label:"${hit.label}"`)}` : null,
      }
      return { repo, item }
    })
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
