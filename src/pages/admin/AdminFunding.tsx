import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Pencil, Plus } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { errorMessage } from '../../lib/errors'
import { formatDate, formatMoney } from '../../lib/format'
import { FUNDING_STATUS, listFundingPrograms } from '../../services/funding.service'
import { listAllFunding, reviewFunding, saveFundingProgram } from '../../services/admin.service'
import type { FundingApplication, FundingProgram, FundingStatus } from '../../types/database'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input, Textarea, Toggle } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { safeUrl } from '../../lib/safeUrl'

type Filter = 'open' | 'approved' | 'rejected' | 'all'

function Block({ label, text }: { label: string; text: string | null }) {
  if (!text) return null
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-text-primary">{text}</p>
    </div>
  )
}

export default function AdminFunding() {
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('open')
  const apps = useAsync(() => listAllFunding(filter === 'all' ? undefined : filter), [filter])
  const programs = useAsync(() => listFundingPrograms(true), [])
  const [open, setOpen] = useState<FundingApplication | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState<FundingStatus | null>(null)
  const [editing, setEditing] = useState<Partial<FundingProgram> | null>(null)
  const [savingProgram, setSavingProgram] = useState(false)

  const decide = async (status: FundingStatus) => {
    if (!open) return
    setSaving(status)
    try {
      await reviewFunding(open.id, status, note)
      toast(`Marked as ${FUNDING_STATUS[status].label.toLowerCase()} — the applicant was notified`)
      setOpen(null)
      apps.refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSaving(null)
    }
  }

  const saveProgram = async () => {
    if (!editing?.name?.trim() || !editing.provider?.trim()) {
      toast('Add a name and provider', 'error')
      return
    }
    setSavingProgram(true)
    try {
      await saveFundingProgram({ ...editing, name: editing.name.trim(), provider: editing.provider.trim() })
      toast('Program saved')
      setEditing(null)
      programs.refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSavingProgram(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Funding</h1>
      <p className="mt-1 text-text-secondary">Review applications and manage the programs builders see.</p>

      <Tabs<Filter>
        className="mt-6"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'open', label: 'To review' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Not approved' },
          { value: 'all', label: 'All' },
        ]}
      />

      <div className="mt-4">
        {apps.loading ? (
          <ListSkeleton rows={3} />
        ) : apps.error ? (
          <ErrorState message={apps.error} onRetry={apps.reload} />
        ) : !apps.data?.length ? (
          <EmptyState title={filter === 'open' ? 'Nothing waiting for review' : 'No applications here'} />
        ) : (
          <div className="flex flex-col gap-3">
            {apps.data.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setOpen(a)
                  setNote(a.admin_note ?? '')
                }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong"
              >
                <Avatar name={a.applicant?.name} src={a.applicant?.avatar_url} size="md" seed={a.user_id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-text-primary">{a.project_name}</span>
                  <span className="block truncate text-sm text-text-secondary">
                    {a.applicant?.name ?? 'Builder'} · {formatMoney(a.amount_requested)} · {formatDate(a.created_at)}
                  </span>
                </span>
                <Badge tone={FUNDING_STATUS[a.status].tone}>{FUNDING_STATUS[a.status].label}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-text-primary">Programs</h2>
          <Button size="sm" variant="secondary" icon={<Plus size={15} />} onClick={() => setEditing({ region: 'Global', is_active: true, tags: [] })}>
            Add program
          </Button>
        </div>
        {programs.loading ? (
          <ListSkeleton rows={3} />
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {(programs.data ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text-primary">
                    {p.name} {!p.is_active && <span className="text-xs font-normal text-text-muted">(hidden)</span>}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {p.provider} · {p.region} {p.is_internal ? '· in-app application' : ''}
                  </p>
                </div>
                {safeUrl(p.url) && (
                  <a href={safeUrl(p.url)} target="_blank" rel="noreferrer" aria-label="Open link" className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary">
                    <ExternalLink size={16} />
                  </a>
                )}
                <button onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary">
                  <Pencil size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.project_name}
        size="lg"
        footer={
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="secondary" className="flex-1" loading={saving === 'under_review'} onClick={() => decide('under_review')}>
              Under review
            </Button>
            <Button variant="danger" className="flex-1" loading={saving === 'rejected'} onClick={() => decide('rejected')}>
              Not approved
            </Button>
            <Button className="flex-1" loading={saving === 'approved'} onClick={() => decide('approved')}>
              Approve
            </Button>
          </div>
        }
      >
        {open && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={FUNDING_STATUS[open.status].tone}>{FUNDING_STATUS[open.status].label}</Badge>
              <span className="text-lg font-bold text-text-primary">{formatMoney(open.amount_requested)}</span>
              <span className="text-sm text-text-secondary">requested {formatDate(open.created_at)}</span>
            </div>
            <Link to={`/u/${open.user_id}`} className="mt-3 flex items-center gap-2 text-sm text-text-primary hover:underline">
              <Avatar name={open.applicant?.name} src={open.applicant?.avatar_url} size="xs" seed={open.user_id} />
              {open.applicant?.name ?? 'Builder'} {open.contact_email && <span className="text-text-secondary">· {open.contact_email}</span>}
            </Link>
            {open.project_id && (
              <Link to={`/project/${open.project_id}`} className="mt-1 block text-sm text-accent hover:underline">
                View project on Cobuild →
              </Link>
            )}
            <Block label="Pitch" text={open.pitch} />
            <Block label="Use of funds" text={open.use_of_funds} />
            <Block label="Traction" text={open.traction} />
            <Block label="Team" text={open.team} />
            <Block label="Links" text={open.links} />
            <Field label="Note to the applicant" optional className="mt-5" hint="They see this with the status update.">
              {(id) => <Textarea id={id} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Great traction — we'll intro you to two grant programs." />}
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit program' : 'Add program'}
        footer={
          <Button fullWidth loading={savingProgram} onClick={saveProgram}>
            Save program
          </Button>
        }
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <Field label="Name">{(id) => <Input id={id} value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />}</Field>
            <Field label="Provider">{(id) => <Input id={id} value={editing.provider ?? ''} onChange={(e) => setEditing({ ...editing, provider: e.target.value })} />}</Field>
            <Field label="Description">
              {(id) => <Textarea id={id} rows={3} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount label" optional>
                {(id) => <Input id={id} value={editing.amount_text ?? ''} placeholder="Grants, Cloud credits…" onChange={(e) => setEditing({ ...editing, amount_text: e.target.value })} />}
              </Field>
              <Field label="Region">{(id) => <Input id={id} value={editing.region ?? 'Global'} onChange={(e) => setEditing({ ...editing, region: e.target.value })} />}</Field>
            </div>
            {!editing.is_internal && (
              <Field label="Link">{(id) => <Input id={id} value={editing.url ?? ''} placeholder="https://" onChange={(e) => setEditing({ ...editing, url: e.target.value })} />}</Field>
            )}
            <Field label="Tags" optional hint="Comma separated">
              {(id) => (
                <Input
                  id={id}
                  value={(editing.tags ?? []).join(', ')}
                  onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                />
              )}
            </Field>
            <Card className="p-4">
              <Toggle checked={editing.is_active ?? true} onChange={(v) => setEditing({ ...editing, is_active: v })} label="Visible to builders" />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  )
}
