import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, Check, ChevronLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { BRAND } from '../config/brand'
import { cn } from '../lib/cn'
import { errorMessage } from '../lib/errors'
import { AVAILABILITY, COUNTRIES, EXPERIENCE, INTERESTS, REFERRALS, ROLES, type Option } from '../lib/constants'
import { getAllSkills, getUserSkillIds, isUsernameAvailable, setUserSkills, updateProfile } from '../services/profiles.service'
import { uploadAvatar } from '../services/storage.service'
import type { Skill } from '../types/database'
import { LogoMark } from '../components/Logo'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Spinner } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

function suggestUsername(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16)
}

function OptionCard({ option, selected, onClick, multi }: { option: Option; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex min-h-[60px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
        selected ? 'border-accent bg-accent/[0.08]' : 'border-border bg-surface hover:border-border-strong',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-text-primary">{option.label}</span>
        {option.hint && <span className="mt-0.5 block text-[13px] text-text-secondary">{option.hint}</span>}
      </span>
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-colors',
          multi ? 'rounded-md' : 'rounded-full',
          selected ? 'border-accent bg-accent text-accent-ink' : 'border-border-strong',
        )}
      >
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  )
}

interface Answers {
  name: string
  username: string
  role: string
  experience: string
  skills: Set<number>
  interests: string[]
  country: string
  availability: string
  referral: string
  github: string
  xHandle: string
  bio: string
}

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allSkills, setAllSkills] = useState<Skill[] | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [usernameTouched, setUsernameTouched] = useState(!!profile?.username)
  const fileRef = useRef<HTMLInputElement>(null)

  const [a, setA] = useState<Answers>(() => ({
    name: profile?.name ?? '',
    username: profile?.username ?? '',
    role: profile?.primary_role ?? '',
    experience: profile?.experience_level ?? '',
    skills: new Set(),
    interests: profile?.interests ?? [],
    country: profile?.country ?? '',
    availability: profile?.availability ?? '',
    referral: profile?.referral_source ?? '',
    github: profile?.github_url ?? '',
    xHandle: profile?.x_handle ?? '',
    bio: profile?.bio ?? '',
  }))
  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setA((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    getAllSkills().then(setAllSkills).catch(() => setAllSkills([]))
    if (user) getUserSkillIds(user.id).then((ids) => setA((p) => ({ ...p, skills: new Set(ids) }))).catch(() => {})
  }, [user])

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  const roleIsListed = ROLES.some((r) => r.value === a.role)

  const steps: { title: string; subtitle: string; valid: boolean; body: ReactNode }[] = useMemo(
    () => [
      {
        title: `Welcome to ${BRAND.name} 👋`,
        subtitle: "Let's set up your builder profile. It takes about a minute.",
        valid: a.name.trim().length >= 2 && USERNAME_RE.test(a.username),
        body: (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative rounded-full focus-visible:outline-accent"
                aria-label="Add a profile photo"
              >
                {avatarPreview || profile?.avatar_url ? (
                  <Avatar src={avatarPreview ?? profile?.avatar_url} name={a.name} size="xl" />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-border-strong bg-surface text-text-muted">
                    <Camera size={24} />
                  </span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-ink ring-4 ring-bg">
                  <Camera size={13} />
                </span>
              </button>
              <div className="text-sm text-text-secondary">
                <p className="font-medium text-text-primary">Profile photo</p>
                <p>Optional — people trust faces.</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  if (!f.type.startsWith('image/')) return setError('Please pick an image file.')
                  if (f.size > 5 * 1024 * 1024) return setError('Images must be under 5MB.')
                  setError(null)
                  setAvatarFile(f)
                  setAvatarPreview(URL.createObjectURL(f))
                }}
              />
            </div>
            <Field label="Your name">
              {(id) => (
                <Input
                  id={id}
                  autoFocus
                  value={a.name}
                  maxLength={60}
                  placeholder="e.g. Ada Obi"
                  autoComplete="name"
                  onChange={(e) => {
                    const name = e.target.value
                    setA((p) => ({ ...p, name, username: usernameTouched ? p.username : suggestUsername(name) }))
                  }}
                />
              )}
            </Field>
            <Field
              label="Username"
              hint="3–20 characters: lowercase letters, numbers or _"
              error={a.username && !USERNAME_RE.test(a.username) ? 'Only lowercase letters, numbers and _ (3–20 characters).' : null}
            >
              {(id) => (
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-text-muted">@</span>
                  <Input
                    id={id}
                    value={a.username}
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="adaobi"
                    className="pl-9"
                    onChange={(e) => {
                      setUsernameTouched(true)
                      set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }}
                  />
                </div>
              )}
            </Field>
          </div>
        ),
      },
      {
        title: 'What do you do?',
        subtitle: 'Pick the one that fits best. This helps us match you with projects.',
        valid: !!a.role.trim(),
        body: (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ROLES.map((r) => (
              <OptionCard key={r.value} option={r} selected={a.role === r.value} onClick={() => set('role', r.value)} />
            ))}
            {!roleIsListed && a.role && <OptionCard option={{ value: a.role, label: a.role, hint: 'Your current role' }} selected onClick={() => {}} />}
          </div>
        ),
      },
      {
        title: 'How experienced are you?',
        subtitle: 'Everyone is welcome — beginners included.',
        valid: !!a.experience,
        body: (
          <div className="flex flex-col gap-2.5">
            {EXPERIENCE.map((o) => (
              <OptionCard key={o.value} option={o} selected={a.experience === o.value} onClick={() => set('experience', o.value)} />
            ))}
          </div>
        ),
      },
      {
        title: 'What are you good at?',
        subtitle: 'Pick a few skills. Projects that need them will find you.',
        valid: a.skills.size > 0,
        body: allSkills === null ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <div>
            <p className="mb-3 text-[13px] text-text-secondary">{a.skills.size} selected</p>
            <div className="flex flex-wrap gap-2">
              {allSkills.map((s) => {
                const on = a.skills.has(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const next = new Set(a.skills)
                      if (on) next.delete(s.id)
                      else next.add(s.id)
                      set('skills', next)
                    }}
                    className={cn(
                      'h-10 rounded-full border px-4 text-sm font-medium transition-colors',
                      on ? 'border-accent bg-accent text-accent-ink' : 'border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary',
                    )}
                  >
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>
        ),
      },
      {
        title: 'What brings you here?',
        subtitle: 'Choose everything that applies.',
        valid: a.interests.length > 0,
        body: (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {INTERESTS.map((o) => {
              const on = a.interests.includes(o.value)
              return (
                <OptionCard
                  key={o.value}
                  multi
                  option={o}
                  selected={on}
                  onClick={() => set('interests', on ? a.interests.filter((v) => v !== o.value) : [...a.interests, o.value])}
                />
              )
            })}
          </div>
        ),
      },
      {
        title: 'Last few details',
        subtitle: 'Almost done. These help us build the right community.',
        valid: !!a.country && !!a.availability && !!a.referral,
        body: (
          <div className="flex flex-col gap-5">
            <Field label="Where are you based?">
              {(id) => (
                <Select id={id} value={a.country} onChange={(e) => set('country', e.target.value)}>
                  <option value="">Choose your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="How much time can you give side projects?">
              {(id) => (
                <Select id={id} value={a.availability} onChange={(e) => set('availability', e.target.value)}>
                  <option value="">Choose one</option>
                  {AVAILABILITY.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={`How did you hear about ${BRAND.name}?`}>
              {(id) => (
                <Select id={id} value={a.referral} onChange={(e) => set('referral', e.target.value)}>
                  <option value="">Choose one</option>
                  {REFERRALS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="GitHub" optional>
                {(id) => <Input id={id} value={a.github} placeholder="github.com/you" autoCapitalize="none" onChange={(e) => set('github', e.target.value)} />}
              </Field>
              <Field label="X handle" optional>
                {(id) => (
                  <Input id={id} value={a.xHandle} placeholder="@you" autoCapitalize="none" onChange={(e) => set('xHandle', e.target.value.replace(/^@+/, ''))} />
                )}
              </Field>
            </div>
            <Field label="Short bio" optional counter={{ value: a.bio.length, max: 160 }}>
              {(id) => <Textarea id={id} rows={3} maxLength={160} value={a.bio} placeholder="I build Flutter apps for African fintechs." onChange={(e) => set('bio', e.target.value)} />}
            </Field>
          </div>
        ),
      },
    ],
    [a, allSkills, avatarPreview, profile?.avatar_url, roleIsListed, usernameTouched],
  )

  const current = steps[step]
  const isLast = step === steps.length - 1

  const next = async () => {
    if (!user || !current.valid) return
    setError(null)
    if (step === 0) {
      setSaving(true)
      try {
        const free = await isUsernameAvailable(a.username, user.id)
        if (!free) {
          setError('That username is taken. Try another one.')
          return
        }
      } catch (err) {
        setError(errorMessage(err))
        return
      } finally {
        setSaving(false)
      }
    }
    if (!isLast) {
      setStep((s) => s + 1)
      window.scrollTo(0, 0)
      return
    }

    setSaving(true)
    try {
      let avatar_url = profile?.avatar_url ?? null
      if (avatarFile) avatar_url = await uploadAvatar(user.id, avatarFile)
      const github = a.github.trim()
      await updateProfile(user.id, {
        name: a.name.trim(),
        username: a.username,
        primary_role: a.role,
        experience_level: a.experience,
        interests: a.interests,
        country: a.country,
        availability: a.availability,
        referral_source: a.referral,
        github_url: github ? (/^https?:\/\//.test(github) ? github : `https://${github.replace(/^\/+/, '')}`) : null,
        x_handle: a.xHandle.trim() || null,
        bio: a.bio.trim() || null,
        avatar_url,
        onboarded_at: profile?.onboarded_at ?? new Date().toISOString(),
      })
      await setUserSkills(user.id, Array.from(a.skills))
      await refreshProfile()
      toast(`Welcome to ${BRAND.name}, ${a.name.trim().split(/\s+/)[0]}!`)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/onboarding' ? from : '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-32 pt-6 sm:px-8 sm:pt-10">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-2 hover:text-text-primary"
            >
              <ChevronLeft size={22} />
            </button>
          ) : (
            <LogoMark />
          )}
          <ProgressBar value={((step + 1) / steps.length) * 100} size="sm" className="flex-1" label="Onboarding progress" />
          <span className="w-12 text-right text-[13px] font-medium tabular-nums text-text-secondary">
            {step + 1}/{steps.length}
          </span>
        </div>

        <form
          className="mt-10 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
        >
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-text-primary sm:text-[32px]">{current.title}</h1>
          <p className="mt-2 text-[15px] text-text-secondary">{current.subtitle}</p>
          <div className="mt-8 animate-pop" key={step}>
            {current.body}
          </div>

          {error && (
            <p className="mt-6 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl sm:static sm:mt-10 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <div className="mx-auto max-w-2xl">
              <Button type="submit" size="lg" fullWidth disabled={!current.valid} loading={saving}>
                {isLast ? 'Finish and start building' : 'Continue'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
