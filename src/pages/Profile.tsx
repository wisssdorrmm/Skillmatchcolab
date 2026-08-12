import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Pencil, Check, X, Camera, Briefcase, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getSkillsForUser, getUserSkillIds, setUserSkills, updateProfile } from '../services/profiles.service'
import { getAllSkills } from '../services/skills.service'
import { uploadAvatar } from '../services/storage.service'
import type { Skill } from '../types/database'

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()

  const [skills, setSkills] = useState<Skill[]>([])
  const [editing, setEditing] = useState(false)

  const [name, setName] = useState('')
  const [primaryRole, setPrimaryRole] = useState('')
  const [bio, setBio] = useState('')
  const [goal, setGoal] = useState('')
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)

  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  useEffect(() => {
    if (!user) return
    getSkillsForUser(user.id).then(setSkills)
  }, [user])

  const startEditing = async () => {
    if (!user || !profile) return
    setName(profile.name ?? '')
    setPrimaryRole(profile.primary_role ?? '')
    setBio(profile.bio ?? '')
    setGoal(profile.goal ?? '')
    setAvatarUrl(profile.avatar_url ?? '')
    setAvatarPreview(null)
    setAvatarFile(null)
    const [all, mine] = await Promise.all([getAllSkills(), getUserSkillIds(user.id)])
    setAllSkills(all)
    setSelectedSkillIds(new Set(mine))
    setEditing(true)
  }

  const toggleSkill = (id: number) => {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      let finalAvatarUrl = avatarUrl
      if (avatarFile) {
        setUploadingAvatar(true)
        finalAvatarUrl = await uploadAvatar(user.id, avatarFile)
        setUploadingAvatar(false)
      }

      await updateProfile(user.id, {
        name: name.trim(),
        primary_role: primaryRole.trim(),
        bio: bio.trim(),
        goal: goal.trim(),
        avatar_url: finalAvatarUrl || null,
      })
      await setUserSkills(user.id, Array.from(selectedSkillIds))
      await refreshProfile()
      const updatedSkills = await getSkillsForUser(user.id)
      setSkills(updatedSkills)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null

  if (editing) {
    return (
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Edit Profile</h1>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-text-muted hover:text-text-secondary">
              <X size={20} />
            </button>
            <button onClick={handleSave} disabled={saving} className="text-accent hover:text-accent-hover disabled:opacity-50">
              <Check size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-text-muted transition-colors hover:border-accent"
            >
              {avatarPreview || avatarUrl ? (
                <img src={avatarPreview ?? avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
              ) : (
                <Camera size={22} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <span className="text-xs text-text-muted">
              {uploadingAvatar ? 'Uploading…' : 'Tap to change photo'}
            </span>
          </div>

          <Field label="Name" value={name} onChange={setName} />
          <Field label="Primary role" value={primaryRole} onChange={setPrimaryRole} />
          <Field label="Bio" value={bio} onChange={setBio} textarea />
          <Field label="Goal" value={goal} onChange={setGoal} />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Skills</label>
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
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-accent/20 text-lg font-medium text-accent">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name ?? 'Avatar'} className="h-full w-full object-cover" />
            ) : (
              profile.name?.charAt(0)?.toUpperCase() ?? '?'
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{profile.name}</h1>
            <p className="text-sm text-text-secondary">{profile.primary_role}</p>
          </div>
        </div>
        <button onClick={startEditing} className="text-text-muted hover:text-accent" aria-label="Edit profile">
          <Pencil size={18} />
        </button>
      </div>

      {profile.bio && <p className="mb-4 text-sm text-text-secondary">{profile.bio}</p>}

      {profile.goal && (
        <div className="mb-5 rounded-lg bg-surface p-3">
          <p className="text-[11px] uppercase tracking-wide text-text-muted">Goal</p>
          <p className="text-sm text-text-primary">{profile.goal}</p>
        </div>
      )}

      {skills.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s.id} className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/my-projects')}
        className="mb-4 flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 hover:border-accent/50"
      >
        <span className="flex items-center gap-2.5 text-sm text-text-primary">
          <Briefcase size={17} className="text-accent" /> My Projects
        </span>
        <ChevronRight size={16} className="text-text-muted" />
      </button>

      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-surface">
        <SettingsRow label="Terms of Service" onClick={() => navigate('/terms')} />
        <SettingsRow label="Privacy Policy" onClick={() => navigate('/privacy')} />
        <SettingsRow label="Help & Support" onClick={() => window.open('mailto:support@skillmatchhub.app')} />
        <SettingsRow
          label="Deactivate Account"
          danger
          onClick={() => navigate('/deactivate-account')}
          last
        />
      </div>

      <button
        onClick={signOut}
        className="flex items-center gap-2 text-sm text-danger hover:underline"
      >
        <LogOut size={16} /> Log out
      </button>
    </div>
  )
}

function SettingsRow({
  label,
  onClick,
  danger,
  last,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  last?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between px-4 py-3.5 text-left text-sm hover:bg-surface-hover ${
        !last ? 'border-b border-border' : ''
      } ${danger ? 'text-danger' : 'text-text-primary'}`}
    >
      {label}
      <ChevronRight size={16} className={danger ? 'text-danger' : 'text-text-muted'} />
    </button>
  )
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  textarea?: boolean
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      )}
    </div>
  )
}
