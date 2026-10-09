import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/cn'
import { errorMessage } from '../lib/errors'
import { AVAILABILITY, COUNTRIES, EXPERIENCE, INTERESTS, ROLES } from '../lib/constants'
import { getAllSkills, getUserSkillIds, isUsernameAvailable, setUserSkills, updateProfile } from '../services/profiles.service'
import { uploadAvatar } from '../services/storage.service'
import type { Skill } from '../types/database'
import { PageHeader } from '../components/ui/PageHeader'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'

const toUrl = (v: string) => {
  const t = v.trim()
  if (!t) return null
  return /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, '')}`
}

export default function EditProfile() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(profile?.name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [role, setRole] = useState(profile?.primary_role ?? '')
  const [experience, setExperience] = useState(profile?.experience_level ?? '')
  const [availability, setAvailability] = useState(profile?.availability ?? '')
  const [country, setCountry] = useState(profile?.country ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [github, setGithub] = useState(profile?.github_url ?? '')
  const [xHandle, setXHandle] = useState(profile?.x_handle ?? '')
  const [website, setWebsite] = useState(profile?.website_url ?? '')
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? [])
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [skills, setSkills] = useState<Set<number>>(new Set())
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAllSkills().then(setAllSkills).catch(() => {})
    if (user) getUserSkillIds(user.id).then((ids) => setSkills(new Set(ids))).catch(() => {})
  }, [user])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    if (name.trim().length < 2) return setError('Enter your name.')
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return setError('Username: 3–20 lowercase letters, numbers or _.')
    if (!role) return setError('Pick your role.')
    setSaving(true)
    try {
      if (!(await isUsernameAvailable(username, user.id))) {
        setSaving(false)
        return setError('That username is taken.')
      }
      let avatar_url = profile?.avatar_url ?? null
      if (file) avatar_url = await uploadAvatar(user.id, file)
      await updateProfile(user.id, {
        name: name.trim(),
        username,
        primary_role: role,
        experience_level: experience || null,
        availability: availability || null,
        country: country || null,
        bio: bio.trim() || null,
        github_url: toUrl(github),
        x_handle: xHandle.trim().replace(/^@+/, '') || null,
        website_url: toUrl(website),
        interests,
        avatar_url,
      })
      await setUserSkills(user.id, Array.from(skills))
      await refreshProfile()
      toast('Profile saved')
      navigate('/profile')
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  const roleListed = ROLES.some((r) => r.value === role)

  return (
    <div>
      <PageHeader back title="Edit profile" />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative rounded-full" aria-label="Change photo">
              <Avatar name={name} src={preview ?? profile?.avatar_url} size="xl" seed={user?.id} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-ink ring-4 ring-surface">
                <Camera size={13} />
              </span>
            </button>
            <div className="text-sm text-text-secondary">
              <p className="font-medium text-text-primary">Profile photo</p>
              <p>JPG or PNG, up to 5MB.</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (!f.type.startsWith('image/')) return setError('Please pick an image.')
                if (f.size > 5 * 1024 * 1024) return setError('Images must be under 5MB.')
                setError(null)
                setFile(f)
                setPreview(URL.createObjectURL(f))
              }}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name">{(id) => <Input id={id} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}</Field>
            <Field label="Username">
              {(id) => (
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">@</span>
                  <Input id={id} value={username} maxLength={20} className="pl-9" autoCapitalize="none" onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
                </div>
              )}
            </Field>
          </div>
          <Field label="Bio" optional counter={{ value: bio.length, max: 160 }}>
            {(id) => <Textarea id={id} rows={3} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} />}
          </Field>
        </Card>

        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Role">
              {(id) => (
                <Select id={id} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="">Choose your role</option>
                  {!roleListed && role && <option value={role}>{role}</option>}
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Experience">
              {(id) => (
                <Select id={id} value={experience} onChange={(e) => setExperience(e.target.value)}>
                  <option value="">Choose one</option>
                  {EXPERIENCE.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Availability">
              {(id) => (
                <Select id={id} value={availability} onChange={(e) => setAvailability(e.target.value)}>
                  <option value="">Choose one</option>
                  {AVAILABILITY.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Country">
              {(id) => (
                <Select id={id} value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">Choose your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-text-secondary">Skills</p>
            <div className="flex flex-wrap gap-2">
              {allSkills.map((s) => {
                const on = skills.has(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const next = new Set(skills)
                      if (on) next.delete(s.id)
                      else next.add(s.id)
                      setSkills(next)
                    }}
                    className={cn('h-9 rounded-full border px-3.5 text-[13px] font-medium', on ? 'border-accent bg-accent text-accent-ink' : 'border-border text-text-secondary hover:text-text-primary')}
                  >
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-text-secondary">Here to</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((o) => {
                const on = interests.includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setInterests(on ? interests.filter((v) => v !== o.value) : [...interests, o.value])}
                    className={cn('h-9 rounded-full border px-3.5 text-[13px] font-medium', on ? 'border-accent bg-accent text-accent-ink' : 'border-border text-text-secondary hover:text-text-primary')}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        <Card className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
          <Field label="GitHub" optional>
            {(id) => <Input id={id} value={github} autoCapitalize="none" placeholder="github.com/you" onChange={(e) => setGithub(e.target.value)} />}
          </Field>
          <Field label="X handle" optional>
            {(id) => <Input id={id} value={xHandle} autoCapitalize="none" placeholder="@you" onChange={(e) => setXHandle(e.target.value)} />}
          </Field>
          <Field label="Website" optional>
            {(id) => <Input id={id} value={website} autoCapitalize="none" placeholder="you.dev" onChange={(e) => setWebsite(e.target.value)} />}
          </Field>
        </Card>

        {error && (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth loading={saving}>
          Save profile
        </Button>
      </form>
    </div>
  )
}
