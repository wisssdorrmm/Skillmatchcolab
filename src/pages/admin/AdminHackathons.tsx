import { useMemo, useState } from 'react'
import { ExternalLink, Eye, EyeOff, Pencil, Plus, RefreshCw, Search, Star, Trash2 } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../lib/errors'
import { safeUrl } from '../../lib/safeUrl'
import {
  deleteHackathon,
  fetchLatestHackathons,
  importHackathons,
  listAllHackathons,
  patchHackathon,
  saveHackathon,
  todayISO,
  type HackathonDraft,
} from '../../services/hackathons.service'
import type { Hackathon } from '../../types/database'
import { dateRange } from '../../lib/hackathonDates'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input, Toggle } from '../../components/ui/Field'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/ui/States'
import { Tabs } from '../../components/ui/Tabs'
import { useToast } from '../../components/ui/Toast'

type Filter = 'open' | 'hidden' | 'ended'

export default function AdminHackathons() {
  const toast = useToast()
  const list = useAsync(() => listAllHackathons(), [])
  const [filter, setFilter] = useState<Filter>('open')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<HackathonDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Hackathon | null>(null)

  const today = todayISO()
  const groups = useMemo(() => {
    const all = list.data ?? []
    const ended = (h: Hackathon) => !!h.ends_on && h.ends_on < today
    return {
      open: all.filter((h) => h.is_active && !ended(h)),
      hidden: all.filter((h) => !h.is_active && !ended(h)),
      ended: all.filter(ended).reverse(),
    }
  }, [list.data, today])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups[filter].filter((h) => !q || `${h.title} ${h.organizer ?? ''} ${h.source}`.toLowerCase().includes(q))
  }, [groups, filter, search])

  const refresh = async () => {
    setRefreshing('Checking Devpost…')
    try {
      const items = await fetchLatestHackathons((done, total) => setRefreshing(`Checking Devpost… ${done}/${total}`))
      if (!items.length) throw new Error('Devpost returned an empty list. Nothing was changed.')
      setRefreshing('Saving…')
      const saved = await importHackathons(items)
      toast(`Updated ${saved} hackathons from Devpost`)
      list.refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setRefreshing(null)
    }
  }

  const patch = async (h: Hackathon, change: Partial<Pick<Hackathon, 'is_active' | 'is_featured'>>) => {
    list.setData((prev) => prev?.map((x) => (x.id === h.id ? { ...x, ...change } : x)) ?? null)
    try {
      await patchHackathon(h.id, change)
    } catch (err) {
      toast(errorMessage(err), 'error')
      list.refresh()
    }
  }

  const save = async () => {
    if (!editing) return
    if ((editing.title ?? '').trim().length < 2) return toast('Add a name', 'error')
    if (!safeUrl(editing.url)?.startsWith('https://')) return toast('Add the official link (it must start with https://)', 'error')
    if (editing.starts_on && editing.ends_on && editing.ends_on < editing.starts_on) return toast('The end date is before the start date', 'error')
    setSaving(true)
    try {
      await saveHackathon(editing)
      toast('Hackathon saved')
      setEditing(null)
      list.refresh()
    } catch (err) {
      toast(/hackathons_url_key|duplicate key/i.test(errorMessage(err)) ? 'That link is already listed.' : errorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!toDelete) return
    const target = toDelete
    setToDelete(null)
    try {
      await deleteHackathon(target.id)
      list.setData((prev) => prev?.filter((x) => x.id !== target.id) ?? null)
      toast('Hackathon removed')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const iconButton = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary'

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Hackathons</h1>
          <p className="mt-1 text-text-secondary">What builders see in the Hackathons section. Finished ones drop off by themselves.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />} disabled={!!refreshing} onClick={refresh}>
            {refreshing ?? 'Refresh from Devpost'}
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setEditing({ is_online: true, is_active: true, themes: [] })}>
            Add
          </Button>
        </div>
      </div>

      <Tabs<Filter>
        className="mt-6"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'open', label: 'Showing', count: groups.open.length },
          { value: 'hidden', label: 'Hidden', count: groups.hidden.length },
          { value: 'ended', label: 'Ended', count: groups.ended.length },
        ]}
      />

      <div className="relative mt-3">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or organiser" aria-label="Search hackathons" className="pl-10" />
      </div>

      <div className="mt-4">
        {list.loading && !list.data ? (
          <ListSkeleton rows={4} />
        ) : list.error ? (
          <ErrorState message={/could not find the table|does not exist/i.test(list.error) ? 'Run sql/007_hackathons_and_security.sql in Supabase first.' : list.error} onRetry={list.reload} />
        ) : rows.length === 0 ? (
          <EmptyState title={filter === 'open' ? 'No hackathons showing' : filter === 'hidden' ? 'Nothing hidden' : 'Nothing has ended yet'} body={filter === 'open' ? 'Tap "Refresh from Devpost" to pull the current list.' : undefined} />
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {rows.slice(0, 300).map((h) => (
              <div key={h.id} className="flex items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text-primary">{h.title}</p>
                  <p className="truncate text-xs text-text-secondary">
                    {[h.organizer, h.is_online ? 'Online' : h.location, dateRange(h.starts_on, h.ends_on), h.prize_text, h.source, h.joined_count ? `${h.joined_count} from Cobuild` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button onClick={() => patch(h, { is_featured: !h.is_featured })} aria-label={h.is_featured ? `Stop featuring ${h.title}` : `Feature ${h.title}`} aria-pressed={h.is_featured} className={cn(iconButton, h.is_featured && 'text-warning')}>
                  <Star size={16} fill={h.is_featured ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => patch(h, { is_active: !h.is_active })} aria-label={h.is_active ? `Hide ${h.title}` : `Show ${h.title}`} className={iconButton}>
                  {h.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                {safeUrl(h.url) && (
                  <a href={safeUrl(h.url)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${h.title}`} className={cn(iconButton, 'hidden sm:flex')}>
                    <ExternalLink size={16} />
                  </a>
                )}
                <button onClick={() => setEditing(h)} aria-label={`Edit ${h.title}`} className={iconButton}>
                  <Pencil size={16} />
                </button>
                <button onClick={() => setToDelete(h)} aria-label={`Delete ${h.title}`} className={cn(iconButton, 'hover:text-danger')}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit hackathon' : 'Add a hackathon'}
        footer={
          <Button fullWidth loading={saving} onClick={save}>
            Save hackathon
          </Button>
        }
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <Field label="Name">{(id) => <Input id={id} maxLength={160} value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />}</Field>
            <Field label="Organiser" optional>
              {(id) => <Input id={id} maxLength={100} value={editing.organizer ?? ''} onChange={(e) => setEditing({ ...editing, organizer: e.target.value })} />}
            </Field>
            <Field label="Official link" hint="Where people register. Only add events that are free to enter.">
              {(id) => <Input id={id} maxLength={500} inputMode="url" placeholder="https://" value={editing.url ?? ''} onChange={(e) => setEditing({ ...editing, url: e.target.value })} />}
            </Field>
            <Card className="p-4">
              <Toggle checked={editing.is_online ?? true} onChange={(v) => setEditing({ ...editing, is_online: v })} label="Online" description="Anyone can join from anywhere." />
            </Card>
            {!(editing.is_online ?? true) && (
              <Field label="Where">
                {(id) => <Input id={id} maxLength={100} placeholder="Lagos, Nigeria" value={editing.location ?? ''} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />}
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" optional>
                {(id) => <Input id={id} type="date" value={editing.starts_on ?? ''} onChange={(e) => setEditing({ ...editing, starts_on: e.target.value || null })} />}
              </Field>
              <Field label="Ends / deadline" optional>
                {(id) => <Input id={id} type="date" value={editing.ends_on ?? ''} onChange={(e) => setEditing({ ...editing, ends_on: e.target.value || null })} />}
              </Field>
            </div>
            <Field label="Prize" optional hint='As the organiser states it, e.g. "$10,000" or "₦5,000,000".'>
              {(id) => <Input id={id} maxLength={40} value={editing.prize_text ?? ''} onChange={(e) => setEditing({ ...editing, prize_text: e.target.value })} />}
            </Field>
            <Field label="Themes" optional hint="Comma separated, up to 6">
              {(id) => (
                <Input
                  id={id}
                  value={(editing.themes ?? []).join(', ')}
                  placeholder="AI, Web3, Beginner Friendly"
                  onChange={(e) => setEditing({ ...editing, themes: e.target.value.split(',').map((t) => t.trim().slice(0, 40)).filter((t, i, a) => t && a.indexOf(t) === i) })}
                />
              )}
            </Field>
            <Card className="p-4">
              <Toggle checked={editing.is_active ?? true} onChange={(v) => setEditing({ ...editing, is_active: v })} label="Visible to builders" />
            </Card>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this hackathon?"
        body="It disappears for everyone. If it came from Devpost, hide it instead — otherwise the next refresh adds it back."
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}
