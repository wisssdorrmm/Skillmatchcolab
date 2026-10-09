import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { errorMessage } from '../lib/errors'
import { applyForFunding, listFundingPrograms } from '../services/funding.service'
import { listMyProjects } from '../services/projects.service'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'

export default function FundingApply() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const programs = useAsync(() => listFundingPrograms(), [])
  const projects = useAsync(() => listMyProjects(user!.id), [user?.id])

  const [projectId, setProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [amount, setAmount] = useState('')
  const [pitch, setPitch] = useState('')
  const [useOfFunds, setUseOfFunds] = useState('')
  const [traction, setTraction] = useState('')
  const [team, setTeam] = useState('')
  const [links, setLinks] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const owned = projects.data?.owned ?? []
  const internal = programs.data?.find((p) => p.is_internal)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const chosen = owned.find((p) => p.id === projectId)
    const name = (chosen?.title ?? projectName).trim()
    const amt = Number(amount.replace(/[,\s$]/g, ''))
    if (!name) return setError('Pick one of your projects or type a project name.')
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter how much funding you need (in USD).')
    if (pitch.trim().length < 20) return setError('Tell us a bit more about what you are building (20+ characters).')
    if (useOfFunds.trim().length < 10) return setError('Explain what the money will be used for.')
    setSaving(true)
    try {
      await applyForFunding(user!.id, {
        program_id: internal?.id ?? null,
        project_id: chosen?.id ?? null,
        project_name: name,
        amount_requested: Math.round(amt * 100) / 100,
        pitch: pitch.trim(),
        use_of_funds: useOfFunds.trim(),
        traction: traction.trim(),
        team: team.trim(),
        links: links.trim(),
        contact_email: email.trim(),
      })
      toast('Application submitted — we will be in touch')
      navigate('/funding', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader back title="Apply for funding" subtitle="Be specific. Clear answers get faster replies." />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <Field label="Which project?">
            {(id) => (
              <Select id={id} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">{owned.length ? 'Choose one of your projects' : 'Not listed yet'}</option>
                {owned.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · {p.progress}%
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {!projectId && (
            <Field label="Project name" hint="Not on Cobuild yet? Type its name.">
              {(id) => <Input id={id} value={projectName} maxLength={120} onChange={(e) => setProjectName(e.target.value)} placeholder="LagosRide" />}
            </Field>
          )}
          <Field label="How much do you need? (USD)">
            {(id) => (
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                <Input id={id} value={amount} inputMode="decimal" className="pl-8" placeholder="5,000" onChange={(e) => setAmount(e.target.value)} />
              </div>
            )}
          </Field>
        </Card>

        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <Field label="What are you building and why now?" counter={{ value: pitch.length, max: 4000 }}>
            {(id) => <Textarea id={id} rows={5} maxLength={4000} value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="The problem, who has it, and how you solve it." />}
          </Field>
          <Field label="What will the money pay for?" counter={{ value: useOfFunds.length, max: 4000 }}>
            {(id) => <Textarea id={id} rows={4} maxLength={4000} value={useOfFunds} onChange={(e) => setUseOfFunds(e.target.value)} placeholder="e.g. $2k servers for a year, $3k for a part-time designer" />}
          </Field>
          <Field label="Traction so far" optional>
            {(id) => <Textarea id={id} rows={3} value={traction} onChange={(e) => setTraction(e.target.value)} placeholder="Users, revenue, waitlist, pilots…" />}
          </Field>
          <Field label="Who is on the team?" optional>
            {(id) => <Textarea id={id} rows={3} value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Names, roles and what each person does" />}
          </Field>
        </Card>

        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <Field label="Links" optional hint="Website, demo, pitch deck, GitHub…">
            {(id) => <Textarea id={id} rows={2} value={links} onChange={(e) => setLinks(e.target.value)} placeholder="https://…" />}
          </Field>
          <Field label="Best email to reach you">
            {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
        </Card>

        {error && (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth loading={saving}>
          Submit application
        </Button>
      </form>
    </div>
  )
}
