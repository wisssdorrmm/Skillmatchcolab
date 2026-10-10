import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MessagesSquare, Search, ShieldCheck, Swords, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { errorMessage } from '../lib/errors'
import { listHackathonMembers, listHackathons, listMyHackathonIds, setHackathonJoined } from '../services/hackathons.service'
import type { Hackathon } from '../types/database'
import { daysUntil } from '../lib/hackathonDates'
import { HackathonCard } from '../components/hackathon/HackathonParts'
import { Avatar } from '../components/ui/Avatar'
import { Chip } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { Tabs } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'

type Tab = 'online' | 'in-person' | 'mine'
type Sort = 'soon' | 'popular' | 'prize' | 'new'
const PAGE = 20

export default function Hackathons() {
  const { user, isAdmin } = useAuth()
  const uid = user?.id ?? ''
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'mine' ? 'mine' : params.get('tab') === 'in-person' ? 'in-person' : 'online'

  const list = useAsync(() => listHackathons(), [])
  const mine = useAsync(() => listMyHackathonIds(uid), [uid])
  const [search, setSearch] = useState('')
  const [theme, setTheme] = useState('')
  const [sort, setSort] = useState<Sort>('popular')
  const [shown, setShown] = useState(PAGE)
  const [busy, setBusy] = useState<string | null>(null)
  const [membersOf, setMembersOf] = useState<Hackathon | null>(null)

  const all = useMemo(() => list.data?.items ?? [], [list.data])
  const joinedIds = useMemo(() => mine.data ?? new Set<string>(), [mine.data])

  const inTab = useMemo(
    () => all.filter((h) => (tab === 'mine' ? joinedIds.has(h.id) : tab === 'online' ? h.is_online : !h.is_online)),
    [all, tab, joinedIds],
  )

  const themes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const h of inTab) for (const t of h.themes) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t)
  }, [inTab])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = inTab.filter(
      (h) =>
        (!theme || h.themes.includes(theme)) &&
        (!q || `${h.title} ${h.organizer ?? ''} ${h.location ?? ''} ${h.themes.join(' ')}`.toLowerCase().includes(q)),
    )
    const byDeadline = (a: Hackathon, b: Hackathon) => (a.ends_on ?? '9999').localeCompare(b.ends_on ?? '9999')
    if (sort === 'popular') rows.sort((a, b) => b.participants + b.joined_count * 50 - (a.participants + a.joined_count * 50) || byDeadline(a, b))
    else if (sort === 'prize') rows.sort((a, b) => (b.prize_usd ?? 0) - (a.prize_usd ?? 0) || byDeadline(a, b))
    else if (sort === 'new') rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || byDeadline(a, b))
    else rows.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || byDeadline(a, b) || b.participants - a.participants)
    return rows
  }, [inTab, search, theme, sort])

  useEffect(() => setShown(PAGE), [tab, search, theme, sort])
  useEffect(() => {
    if (theme && !themes.includes(theme)) setTheme('')
  }, [theme, themes])

  const endingThisWeek = all.filter((h) => {
    const d = daysUntil(h.ends_on)
    return d != null && d <= 7
  }).length

  const toggleJoin = async (h: Hackathon) => {
    const next = !joinedIds.has(h.id)
    setBusy(h.id)
    const apply = (on: boolean) => {
      mine.setData((prev) => {
        const copy = new Set(prev ?? [])
        if (on) copy.add(h.id)
        else copy.delete(h.id)
        return copy
      })
      list.setData((prev) =>
        prev ? { ...prev, items: prev.items.map((x) => (x.id === h.id ? { ...x, joined_count: Math.max(0, x.joined_count + (on ? 1 : -1)) } : x)) } : prev,
      )
    }
    apply(next)
    try {
      await setHackathonJoined(h.id, uid, next)
      if (next) toast("You're in — other builders can now see you're joining")
    } catch (err) {
      apply(!next)
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Hackathons"
        subtitle="Build something in a weekend. Win prizes, meet teammates, ship faster."
        actions={
          isAdmin ? (
            <ButtonLink to="/admin/hackathons" size="sm" variant="secondary" icon={<ShieldCheck size={15} />}>
              Manage
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {[
          { label: 'Open now', value: all.length },
          { label: 'Online', value: all.filter((h) => h.is_online).length },
          { label: 'Ending soon', value: endingThisWeek },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-3.5 sm:p-4">
            <p className="truncate text-[12px] text-text-secondary sm:text-[13px]">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-text-primary">{list.loading && !list.data ? '–' : s.value}</p>
          </div>
        ))}
      </div>

      <Link
        to="/community/hackathons"
        className="group mt-3 flex items-center gap-3 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.10] to-transparent p-4 transition-colors hover:border-accent/50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
          <MessagesSquare size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-text-primary">Need teammates?</span>
          <span className="block text-[13px] text-text-secondary">Say which hackathon you're joining in #hackathons.</span>
        </span>
      </Link>

      <Tabs<Tab>
        className="mt-6"
        value={tab}
        onChange={(v) => setParams(v === 'online' ? {} : { tab: v }, { replace: true })}
        tabs={[
          { value: 'online', label: 'Online' },
          { value: 'in-person', label: 'In person' },
          { value: 'mine', label: "I'm in", count: joinedIds.size },
        ]}
      />

      <div className="mt-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search hackathons" aria-label="Search hackathons" className="pl-10" maxLength={80} />
        </div>
        <div className="w-[150px] shrink-0 sm:w-[180px]">
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort hackathons">
            <option value="popular">Most popular</option>
            <option value="soon">Ending soon</option>
            <option value="prize">Biggest prize</option>
            <option value="new">Newly added</option>
          </Select>
        </div>
      </div>

      {themes.length > 1 && (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Chip active={!theme} onClick={() => setTheme('')}>
            All themes
          </Chip>
          {themes.map((t) => (
            <Chip key={t} active={theme === t} onClick={() => setTheme(theme === t ? '' : t)}>
              {t}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-4">
        {list.loading && !list.data ? (
          <ListSkeleton rows={4} />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : list.data && !list.data.ready ? (
          <EmptyState
            icon={<Swords size={22} />}
            title="Hackathons are on the way"
            body={isAdmin ? 'Run sql/007_hackathons_and_security.sql in Supabase to switch this section on.' : "We're setting this section up. Check back shortly."}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={tab === 'mine' ? <Users size={22} /> : <Swords size={22} />}
            title={tab === 'mine' ? "You haven't joined any yet" : 'No hackathons match'}
            body={tab === 'mine' ? 'Tap "Count me in" on a hackathon so other builders know you\'re joining and can team up with you.' : 'Try another theme or clear the search.'}
            action={
              tab === 'mine' ? (
                <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                  Browse hackathons
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {visible.slice(0, shown).map((h) => (
                <HackathonCard key={h.id} hackathon={h} joined={joinedIds.has(h.id)} busy={busy === h.id} onToggleJoin={toggleJoin} onShowMembers={setMembersOf} />
              ))}
            </div>
            {visible.length > shown && (
              <Button variant="secondary" fullWidth className="mt-4" onClick={() => setShown((n) => n + PAGE)}>
                Show more ({visible.length - shown} left)
              </Button>
            )}
          </>
        )}
      </div>

      {!!all.length && (
        <p className="mt-6 text-xs leading-relaxed text-text-muted">
          Listed from Devpost and organisers' own pages. Dates, rules and prizes are set by each organiser, so check the official page before you enter.
          Real hackathons are free to join — never pay anyone to take part.
        </p>
      )}

      <MembersModal hackathon={membersOf} onClose={() => setMembersOf(null)} me={uid} />
    </div>
  )
}

function MembersModal({ hackathon, onClose, me }: { hackathon: Hackathon | null; onClose: () => void; me: string }) {
  const members = useAsync(() => (hackathon ? listHackathonMembers(hackathon.id) : Promise.resolve([])), [hackathon?.id])
  return (
    <Modal
      open={!!hackathon}
      onClose={onClose}
      title="Builders joining"
      footer={
        <ButtonLink to="/community/hackathons" fullWidth icon={<MessagesSquare size={17} />}>
          Find teammates in #hackathons
        </ButtonLink>
      }
    >
      {hackathon && (
        <div>
          <p className="text-sm text-text-secondary">{hackathon.title}</p>
          <div className="mt-3">
            {members.loading ? (
              <ListSkeleton rows={2} />
            ) : members.error ? (
              <ErrorState message={members.error} onRetry={members.reload} />
            ) : !members.data?.length ? (
              <p className="py-6 text-center text-sm text-text-secondary">Nobody yet — be the first.</p>
            ) : (
              <ul className="divide-y divide-border">
                {members.data.map((m) => (
                  <li key={m.user_id}>
                    <Link to={`/u/${m.user_id}`} onClick={onClose} className="flex items-center gap-3 py-3 hover:opacity-90">
                      <Avatar name={m.profile?.name} src={m.profile?.avatar_url} size="md" seed={m.user_id} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-[15px] font-semibold text-text-primary">
                          <span className="truncate">{m.profile?.name ?? 'Builder'}</span>
                          <VerifiedBadge show={m.profile?.is_verified} size={14} />
                          {m.user_id === me && <span className="text-xs font-normal text-text-muted">(you)</span>}
                        </span>
                        <span className="block truncate text-[13px] text-text-secondary">
                          {[m.profile?.primary_role ?? 'Builder', m.profile?.country].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
