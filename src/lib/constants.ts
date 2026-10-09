export interface Option {
  value: string
  label: string
  hint?: string
}

export const ROLES: Option[] = [
  { value: 'Frontend Developer', label: 'Frontend Developer', hint: 'Web UIs, React, Vue' },
  { value: 'Backend Developer', label: 'Backend Developer', hint: 'APIs, databases, servers' },
  { value: 'Full-stack Developer', label: 'Full-stack Developer', hint: 'A bit of everything' },
  { value: 'Mobile Developer', label: 'Mobile Developer', hint: 'Flutter, React Native, native' },
  { value: 'AI/ML Engineer', label: 'AI / ML Engineer', hint: 'Models, LLMs, agents' },
  { value: 'Data Scientist', label: 'Data Scientist', hint: 'Analysis, insights, ML' },
  { value: 'DevOps Engineer', label: 'DevOps Engineer', hint: 'Cloud, CI/CD, infra' },
  { value: 'Smart Contract Developer', label: 'Web3 Developer', hint: 'Solidity, onchain apps' },
  { value: 'Game Developer', label: 'Game Developer', hint: 'Unity, Godot, engines' },
  { value: 'Security Engineer', label: 'Security Engineer', hint: 'AppSec, pentesting' },
  { value: 'UI/UX Designer', label: 'UI / UX Designer', hint: 'Apps, websites, product design' },
  { value: 'Graphic Designer', label: 'Graphic Designer', hint: 'Logos, branding, illustration' },
  { value: 'Marketing / Growth', label: 'Marketing / Growth', hint: 'Launches, SEO, social, ads' },
  { value: 'Community Manager', label: 'Community Manager', hint: 'Events, Discord, ambassadors' },
  { value: 'Content Writer', label: 'Writer / Content Creator', hint: 'Blogs, copy, newsletters' },
  { value: 'Video Creator', label: 'Video Creator', hint: 'YouTube, TikTok, tutorials' },
  { value: 'Technical Writer', label: 'Technical Writer', hint: 'Docs, tutorials, guides' },
  { value: 'Translator', label: 'Translator', hint: 'Localise apps and docs' },
  { value: 'QA Tester', label: 'QA / Tester', hint: 'Find bugs before users do' },
  { value: 'UX Researcher', label: 'UX Researcher', hint: 'Interviews, surveys, usability' },
  { value: 'Data Analyst', label: 'Data Analyst', hint: 'Spreadsheets, dashboards, insights' },
  { value: 'Product Manager', label: 'Product Manager', hint: 'Roadmaps, users, specs' },
  { value: 'Founder', label: 'Founder', hint: 'Building a company' },
  { value: 'Student', label: 'Student', hint: 'Learning to build' },
]

/** Explore's "Looking for" filter: each group matches any of these role names. */
export const ROLE_GROUPS: { key: string; label: string; roles: string[] }[] = [
  { key: 'dev', label: 'Developers', roles: ['Frontend Developer', 'Backend Developer', 'Full-stack Developer', 'Mobile Developer', 'AI/ML Engineer', 'DevOps Engineer', 'Systems Engineer', 'Smart Contract Developer', 'Game Developer', 'Security Engineer', 'Software Engineer', 'Co-founder'] },
  { key: 'design', label: 'Designers', roles: ['UI/UX Designer', 'Graphic Designer', 'Product Designer'] },
  { key: 'writing', label: 'Writers', roles: ['Technical Writer', 'Content Writer'] },
  { key: 'marketing', label: 'Marketing & community', roles: ['Marketing / Growth', 'Growth Marketer', 'Community Manager', 'Video Creator'] },
  { key: 'translation', label: 'Translators', roles: ['Translator'] },
  { key: 'testing', label: 'Testers & accessibility', roles: ['QA Tester', 'QA Engineer', 'Accessibility Specialist'] },
  { key: 'research', label: 'Research & data', roles: ['UX Researcher', 'Data Analyst', 'Data Scientist'] },
  { key: 'product', label: 'Product & founders', roles: ['Product Manager', 'Founder', 'Co-founder'] },
]

export const ROLE_SUGGESTIONS = [
  'Frontend Developer', 'Backend Developer', 'Full-stack Developer', 'Mobile Developer', 'AI/ML Engineer',
  'UI/UX Designer', 'Graphic Designer', 'Marketing / Growth', 'Community Manager', 'Content Writer',
  'Video Creator', 'Translator', 'QA Tester', 'UX Researcher', 'Data Analyst', 'Technical Writer',
  'Product Manager', 'DevOps Engineer', 'Smart Contract Developer', 'Game Developer', 'Security Engineer', 'Co-founder',
]

export const EXPERIENCE: Option[] = [
  { value: 'student', label: 'Student / just starting', hint: 'Learning the ropes' },
  { value: 'junior', label: 'Junior', hint: 'Under 2 years building' },
  { value: 'mid', label: 'Mid-level', hint: '2 – 5 years' },
  { value: 'senior', label: 'Senior', hint: '5+ years' },
  { value: 'lead', label: 'Lead / Founder', hint: 'I lead teams or products' },
]

export const AVAILABILITY: Option[] = [
  { value: 'lt5', label: 'Under 5 hrs / week' },
  { value: '5to10', label: '5 – 10 hrs / week' },
  { value: '10to20', label: '10 – 20 hrs / week' },
  { value: '20plus', label: '20+ hrs / week' },
  { value: 'fulltime', label: 'Full-time' },
]

export const INTERESTS: Option[] = [
  { value: 'find_team', label: 'Find teammates for my idea', hint: 'Co-founders, devs, designers' },
  { value: 'join_projects', label: 'Join exciting projects', hint: 'Contribute and build skills' },
  { value: 'open_source', label: 'Contribute to open source', hint: 'Real repos that need help' },
  { value: 'get_funding', label: 'Get funding', hint: 'Grants, credits, investors' },
  { value: 'ship_in_public', label: 'Ship in public', hint: 'Share progress, stay accountable' },
  { value: 'network', label: 'Meet other builders', hint: 'Community and friends' },
  { value: 'learn', label: 'Learn and grow', hint: 'Get better every week' },
  { value: 'hire', label: 'Hire talent', hint: 'Find people for my team' },
]

export const REFERRALS: Option[] = [
  { value: 'x', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'friend', label: 'A friend' },
  { value: 'github', label: 'GitHub' },
  { value: 'google', label: 'Google search' },
  { value: 'community', label: 'A community / event' },
  { value: 'other', label: 'Somewhere else' },
]

export const CATEGORIES = [
  'AI & ML', 'Developer Tools', 'Web', 'Mobile', 'Web3', 'Fintech', 'Health', 'Education', 'Games',
  'Security', 'DevOps & Cloud', 'Design & UI', 'Productivity', 'Social', 'E-commerce', 'Climate', 'Other',
]

export const STAGES: Option[] = [
  { value: 'idea', label: 'Idea', hint: 'Still shaping it' },
  { value: 'building', label: 'Building', hint: 'Writing code' },
  { value: 'beta', label: 'Beta', hint: 'Early users' },
  { value: 'launched', label: 'Launched', hint: 'Live for everyone' },
]

export const TECH_SUGGESTIONS = [
  'React', 'Next.js', 'Vue', 'Svelte', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Node.js', 'Python', 'FastAPI',
  'Django', 'Go', 'Rust', 'Java', 'Kotlin', 'Swift', 'Flutter', 'React Native', 'PHP', 'Laravel', 'Ruby on Rails',
  'PostgreSQL', 'Supabase', 'Firebase', 'MongoDB', 'GraphQL', 'Docker', 'AWS', 'Solidity', 'OpenAI', 'LangChain',
]

export const COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Rwanda', 'Uganda', 'Tanzania', 'Ethiopia', 'Cameroon',
  "Côte d'Ivoire", 'Senegal', 'Morocco', 'Tunisia', 'Algeria', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Malawi',
  'Mozambique', 'Benin', 'Togo', 'Sierra Leone', 'Liberia', 'Gambia',
  'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru',
  'United Kingdom', 'Ireland', 'Germany', 'France', 'Netherlands', 'Belgium', 'Spain', 'Portugal', 'Italy',
  'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Czechia', 'Romania', 'Ukraine',
  'Turkey', 'Greece', 'Israel', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Pakistan', 'India', 'Bangladesh',
  'Sri Lanka', 'Nepal', 'China', 'Japan', 'South Korea', 'Singapore', 'Malaysia', 'Indonesia', 'Philippines',
  'Vietnam', 'Thailand', 'Australia', 'New Zealand', 'Other',
]

export function labelFor(options: Option[], value: string | null | undefined): string {
  if (!value) return ''
  return options.find((o) => o.value === value)?.label ?? value
}

export const STAGE_STYLES: Record<string, string> = {
  idea: 'bg-info/10 text-info',
  building: 'bg-warning/10 text-warning',
  beta: 'bg-accent/10 text-accent',
  launched: 'bg-success/10 text-success',
}
