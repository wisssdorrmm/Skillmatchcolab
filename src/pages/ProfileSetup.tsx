import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updateProfile, getUserSkillIds, setUserSkills } from '../services/profiles.service'
import { getAllSkills } from '../services/skills.service'
import type { Skill } from '../types/database'

export default function ProfileSetup() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const prefillName = (location.state as { name?: string } | null)?.name ?? ''

  const [name, setName] = useState(profile?.name ?? prefillName)
  const [primaryRole, setPrimaryRole] = useState(profile?.primary_role ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [goal, setGoal] = useState(profile?.goal ?? '')
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAllSkills().then(setAllSkills).catch(() => {})
    if (user) {
      getUserSkillIds(user.id)
        .then((ids) => setSelectedSkillIds(new Set(ids)))
        .catch(() => {})
    }
  }, [user])

  const toggleSkill = (id: number) => {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    setLoading(true)
    try {
      await updateProfile(user.id, {
        name: name.trim(),
        primary_role: primaryRole.trim(),
        bio: bio.trim(),
        goal: goal.trim(),
      })
      await setUserSkills(user.id, Array.from(selectedSkillIds))
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg px-6 py-8">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">Profile Setup</p>
      <h1 className="mb-6 text-2xl font-semibold text-text-primary">Tell us about you</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Primary role</label>
          <input
            required
            value={primaryRole}
            onChange={(e) => setPrimaryRole(e.target.value)}
            placeholder="Product Designer"
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Short bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Building the future of collaborative tools."
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">What's your goal?</label>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Find a technical co-founder"
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">Skills</label>
            <span className="text-xs text-text-muted">{selectedSkillIds.size} selected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allSkills.map((skill) => {
              const isSelected = selectedSkillIds.has(skill.id)
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill(skill.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border bg-surface text-text-secondary hover:border-text-muted'
                  }`}
                >
                  {skill.name}
                </button>
              )
            })}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-accent py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
