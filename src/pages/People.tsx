import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, MessageCircle, Search, UsersRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsync, useDebounced } from '../hooks/useAsync'
import { errorMessage } from '../lib/errors'
import { lastActiveLabel } from '../lib/format'
import { ROLES } from '../lib/constants'
import { searchPeople } from '../services/profiles.service'
import { startConversation } from '../services/conversations.service'
import { PageHeader } from '../components/ui/PageHeader'
import { Avatar } from '../components/ui/Avatar'
import { Chip } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'

export default function People() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const q = useDebounced(search, 300)
  const { data, loading, error, reload } = useAsync(() => searchPeople({ search: q, role: role || undefined }), [q, role])
  const [opening, setOpening] = useState<string | null>(null)

  const message = async (otherId: string) => {
    setOpening(otherId)
    try {
      const id = await startConversation(otherId)
      navigate(`/messages/${id}`)
    } catch (err) {
      toast(errorMessage(err), 'error')
      setOpening(null)
    }
  }

  const people = (data ?? []).filter((p) => p.id !== user?.id)

  return (
    <div>
      <PageHeader back title="Find people" subtitle="Meet builders, find a co-founder, or start a conversation." />
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, @username, role or country"
          aria-label="Search people"
          className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Chip active={!role} onClick={() => setRole('')}>
          Everyone
        </Chip>
        {ROLES.map((r) => (
          <Chip key={r.value} active={role === r.value} onClick={() => setRole(role === r.value ? '' : r.value)}>
            {r.label}
          </Chip>
        ))}
      </div>

      <div className="mt-5">
        {loading ? (
          <ListSkeleton rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : people.length === 0 ? (
          <EmptyState icon={<UsersRound size={22} />} title="No one found" body="Try another name or role." />
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                <Link to={`/u/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={p.name} src={p.avatar_url} size="lg" lastSeen={p.show_online ? p.last_seen_at : null} showStatus seed={p.id} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-text-primary">{p.name}</span>
                    <span className="block truncate text-[13px] text-text-secondary">
                      {p.primary_role ?? 'Builder'}
                      {p.username ? ` · @${p.username}` : ''}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                      {p.country && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} /> {p.country}
                        </span>
                      )}
                      {p.show_online && <span>{lastActiveLabel(p.last_seen_at)}</span>}
                    </span>
                  </span>
                </Link>
                <Button size="sm" variant="secondary" icon={<MessageCircle size={15} />} loading={opening === p.id} onClick={() => message(p.id)} aria-label={`Message ${p.name}`}>
                  <span className="hidden sm:inline">Message</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
