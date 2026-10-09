import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Search, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDebounced } from '../../hooks/useAsync'
import { errorMessage } from '../../lib/errors'
import { formatDate, lastActiveLabel, timeAgo } from '../../lib/format'
import { AVAILABILITY, EXPERIENCE, INTERESTS, REFERRALS, labelFor } from '../../lib/constants'
import { listMembers, setAdmin, setVerified, type AdminMember } from '../../services/admin.service'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'

const PAGE = 50

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-right text-text-primary">{value || '—'}</span>
    </div>
  )
}

export default function AdminMembers() {
  const { user } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const q = useDebounced(search, 300)
  const [rows, setRows] = useState<AdminMember[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<AdminMember | null>(null)
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listMembers(q, PAGE, 0)
      .then((r) => {
        if (cancelled) return
        setRows(r)
        setTotal(r[0]?.total_count ?? 0)
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [q, reloadKey])

  const loadMore = async () => {
    setMore(true)
    try {
      const r = await listMembers(q, PAGE, rows.length)
      setRows((prev) => [...prev, ...r.filter((x) => !prev.some((p) => p.id === x.id))])
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setMore(false)
    }
  }

  const toggleVerified = async (m: AdminMember) => {
    setBusy(true)
    try {
      await setVerified(m.id, !m.is_verified)
      const next = { ...m, is_verified: !m.is_verified }
      setRows((prev) => prev.map((r) => (r.id === m.id ? next : r)))
      setOpen(next)
      toast(next.is_verified ? `${m.name ?? 'They'} is now verified` : 'Verified badge removed')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const toggleAdmin = async (m: AdminMember) => {
    setBusy(true)
    try {
      await setAdmin(m.id, !m.is_admin)
      const next = { ...m, is_admin: !m.is_admin }
      setRows((prev) => prev.map((r) => (r.id === m.id ? next : r)))
      setOpen(next)
      toast(next.is_admin ? `${m.name ?? 'They'} is now an admin` : 'Admin access removed')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Members</h1>
      <p className="mt-1 text-text-secondary">{loading ? 'Loading…' : `${total} ${q ? 'matching' : 'total'}`}</p>

      <div className="relative mt-5">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, @username, role or country"
          aria-label="Search members"
          className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <ListSkeleton rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : rows.length === 0 ? (
          <EmptyState title="No members found" />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_70px] gap-3 border-b border-border px-4 py-2.5 text-xs font-medium text-text-muted md:grid">
                <span>Member</span>
                <span>Role</span>
                <span>Joined</span>
                <span>Last active</span>
                <span className="text-right">Projects</span>
              </div>
              <div className="divide-y divide-border">
                {rows.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setOpen(m)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/50 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_70px]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={m.name ?? m.email} src={m.avatar_url} size="md" lastSeen={m.last_seen_at} showStatus seed={m.id} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-text-primary">
                          {m.name ?? 'No name yet'}
                          <VerifiedBadge show={m.is_verified} size={14} />
                          {m.is_admin && <ShieldCheck size={14} className="shrink-0 text-accent" aria-label="Admin" />}
                        </span>
                        <span className="block truncate text-xs text-text-secondary">{m.email}</span>
                      </span>
                    </span>
                    <span className="hidden truncate text-sm text-text-secondary md:block">{m.primary_role ?? '—'}</span>
                    <span className="hidden text-sm text-text-secondary md:block">{formatDate(m.created_at)}</span>
                    <span className="text-right text-xs text-text-secondary md:text-left md:text-sm">{m.last_seen_at ? lastActiveLabel(m.last_seen_at).replace('Active ', '') : 'never'}</span>
                    <span className="hidden text-right text-sm tabular-nums text-text-primary md:block">{m.projects}</span>
                  </button>
                ))}
              </div>
            </div>
            {rows.length < total && (
              <Button variant="secondary" className="mx-auto mt-4 flex" loading={more} onClick={loadMore}>
                Load more
              </Button>
            )}
          </>
        )}
      </div>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.name ?? 'Member'}
        footer={
          open && (
            <div className="flex gap-2">
              <ButtonLink to={`/u/${open.id}`} variant="secondary" className="flex-1">
                View profile
              </ButtonLink>
              {open.id !== user?.id && (
                <Button variant={open.is_admin ? 'danger' : 'primary'} className="flex-1" loading={busy} onClick={() => toggleAdmin(open)}>
                  {open.is_admin ? 'Remove admin' : 'Make admin'}
                </Button>
              )}
            </div>
          )
        }
      >
        {open && (
          <div>
            <div className="flex items-center gap-3">
              <Avatar name={open.name ?? open.email} src={open.avatar_url} size="lg" lastSeen={open.last_seen_at} showStatus seed={open.id} />
              <div className="min-w-0">
                <p className="truncate text-sm text-text-secondary">{open.email}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {open.is_admin && <Badge tone="accent">Admin</Badge>}
                  {open.is_verified && <Badge tone="accent">Verified</Badge>}
                  {open.onboarded_at ? <Badge tone="success">Onboarded</Badge> : <Badge tone="warning">Not onboarded</Badge>}
                </div>
              </div>
            </div>
            <div className="mt-4 divide-y divide-border">
              <Detail label="Username" value={open.username ? `@${open.username}` : null} />
              <Detail label="Role" value={open.primary_role} />
              <Detail label="Experience" value={labelFor(EXPERIENCE, open.experience_level)} />
              <Detail label="Availability" value={labelFor(AVAILABILITY, open.availability)} />
              <Detail label="Country" value={open.country} />
              <Detail label="Heard about us" value={labelFor(REFERRALS, open.referral_source)} />
              <Detail label="Here to" value={(open.interests ?? []).map((i) => labelFor(INTERESTS, i)).join(', ')} />
              <Detail label="Projects" value={String(open.projects)} />
              <Detail label="Joined" value={formatDate(open.created_at)} />
              <Detail label="Last sign-in" value={open.last_sign_in_at ? timeAgo(open.last_sign_in_at) : null} />
              <Detail label="Last active" value={open.last_seen_at ? lastActiveLabel(open.last_seen_at) : null} />
            </div>
            <Button variant="secondary" fullWidth className="mt-4" icon={<BadgeCheck size={16} />} loading={busy} onClick={() => toggleVerified(open)}>
              {open.is_verified ? 'Remove verified badge' : 'Give verified badge'}
            </Button>
            <Link to="/admin/admins" className="mt-3 block text-xs text-text-muted hover:text-text-secondary">
              Manage all admins →
            </Link>
          </div>
        )}
      </Modal>
    </div>
  )
}
