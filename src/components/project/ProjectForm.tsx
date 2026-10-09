import { useState, type FormEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../lib/errors'
import { CATEGORIES, ROLE_SUGGESTIONS, STAGES, TECH_SUGGESTIONS } from '../../lib/constants'
import type { ProjectInput } from '../../services/projects.service'
import { Button } from '../ui/Button'
import { Field, Input, Select, TagInput, Textarea, Toggle } from '../ui/Field'
import { RoadmapEditor } from './RoadmapEditor'
import { roadmapError, type RoadmapDraft } from '../../lib/roadmap'

export interface ProjectFormValues {
  title: string
  tagline: string
  description: string
  category: string
  stage: string
  open: boolean
  roles: string[]
  tech: string[]
  repo: string
  demo: string
  steps: RoadmapDraft[]
}

function Block({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold text-text-primary">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  )
}

function looksLikeUrl(v: string) {
  return !v.trim() || /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(v.trim())
}

interface ProjectFormProps {
  initial: ProjectFormValues
  submitLabel: string
  onSubmit: (input: ProjectInput) => Promise<void>
}

export function ProjectForm({ initial, submitLabel, onSubmit }: ProjectFormProps) {
  const [v, setV] = useState<ProjectFormValues>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tried, setTried] = useState(false)
  const set = <K extends keyof ProjectFormValues>(k: K, value: ProjectFormValues[K]) => setV((p) => ({ ...p, [k]: value }))

  const problems: Record<string, string | null> = {
    title: !v.title.trim() ? 'Give your project a name.' : null,
    description: v.description.trim().length < 20 ? 'Write at least a couple of sentences (20+ characters).' : null,
    category: !v.category ? 'Pick a category.' : null,
    repo: looksLikeUrl(v.repo) ? null : "That doesn't look like a link.",
    demo: looksLikeUrl(v.demo) ? null : "That doesn't look like a link.",
    steps: roadmapError(v.steps),
  }
  const firstProblem = Object.values(problems).find(Boolean) ?? null
  const show = (k: string) => (tried ? problems[k] : null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    setError(null)
    if (firstProblem) {
      setError(firstProblem)
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        title: v.title.trim(),
        tagline: v.tagline.trim(),
        description: v.description.trim(),
        category: v.category,
        stage: v.stage,
        status: v.open ? 'open' : 'closed',
        tech_stack: v.tech,
        roles: v.roles,
        repo_url: v.repo.trim(),
        demo_url: v.demo.trim(),
        milestones: v.steps.map((s) => ({ id: s.id, title: s.title.trim(), weight: Number(s.weight) })),
      })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Block title="The basics" subtitle="What are you building?">
        <Field label="Project name" error={show('title')} counter={{ value: v.title.length, max: 80 }}>
          {(id) => <Input id={id} value={v.title} maxLength={80} placeholder="e.g. LagosRide" onChange={(e) => set('title', e.target.value)} />}
        </Field>
        <Field label="One-line pitch" optional counter={{ value: v.tagline.length, max: 120 }}>
          {(id) => (
            <Input id={id} value={v.tagline} maxLength={120} placeholder="Real-time bus arrivals for Lagos commuters" onChange={(e) => set('tagline', e.target.value)} />
          )}
        </Field>
        <Field label="Description" error={show('description')} counter={{ value: v.description.length, max: 4000 }}>
          {(id) => (
            <Textarea
              id={id}
              rows={6}
              maxLength={4000}
              value={v.description}
              placeholder="What problem does it solve? Who is it for? What's built so far?"
              onChange={(e) => set('description', e.target.value)}
            />
          )}
        </Field>
        <Field label="Category" error={show('category')}>
          {(id) => (
            <Select id={id} value={v.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">Choose a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div>
          <p className="mb-2 text-[13px] font-medium text-text-secondary">Stage</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={v.stage === s.value}
                onClick={() => set('stage', s.value)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-left transition-colors',
                  v.stage === s.value ? 'border-accent bg-accent/[0.08]' : 'border-border hover:border-border-strong',
                )}
              >
                <span className="block text-sm font-semibold text-text-primary">{s.label}</span>
                <span className="block text-xs text-text-secondary">{s.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </Block>

      <Block title="Roadmap" subtitle="Your steps must add up to 100%. Tick them off on the project page to move the progress bar.">
        <RoadmapEditor steps={v.steps} onChange={(steps) => set('steps', steps)} />
        {show('steps') && <p className="text-sm text-danger">{show('steps')}</p>}
      </Block>

      <Block title="Team" subtitle="Who do you need?">
        <Toggle
          checked={v.open}
          onChange={(open) => set('open', open)}
          label="Open to collaborators"
          description="Builders can apply to join your team."
        />
        <Field label="Roles you're looking for" hint="Builders with these roles get notified.">
          {(id) => <TagInput id={id} value={v.roles} onChange={(roles) => set('roles', roles)} placeholder="Type a role and press Enter" suggestions={ROLE_SUGGESTIONS} max={8} />}
        </Field>
        <Field label="Tech stack" optional>
          {(id) => <TagInput id={id} value={v.tech} onChange={(tech) => set('tech', tech)} placeholder="React, Supabase…" suggestions={TECH_SUGGESTIONS} max={12} />}
        </Field>
      </Block>

      <Block title="Links">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Code repository" optional error={show('repo')}>
            {(id) => <Input id={id} value={v.repo} inputMode="url" placeholder="github.com/you/project" autoCapitalize="none" onChange={(e) => set('repo', e.target.value)} />}
          </Field>
          <Field label="Live demo" optional error={show('demo')}>
            {(id) => <Input id={id} value={v.demo} inputMode="url" placeholder="yourproject.com" autoCapitalize="none" onChange={(e) => set('demo', e.target.value)} />}
          </Field>
        </div>
      </Block>

      {error && (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={saving} fullWidth className="mt-1">
        {submitLabel}
      </Button>
    </form>
  )
}
