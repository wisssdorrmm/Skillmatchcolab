import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { errorMessage } from '../../lib/errors'
import { formatDate, lastActiveLabel } from '../../lib/format'
import { addAdminByEmail, listAdmins, setAdmin, type AdminRow } from '../../services/admin.service'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input } from '../../components/ui/Field'
import { ConfirmDialog } from '../../components/ui/Modal'
import { ErrorState, ListSkeleton } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'

export default function AdminAdmins() {
  const { user } = useAuth()
  const toast = useToast()
  const admins = useAsync(listAdmins, [])
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<AdminRow | null>(null)

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    try {
      await addAdminByEmail(email.trim())
      setEmail('')
      toast('Admin added — they can open the admin panel now')
      admins.refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setAdding(false)
    }
  }

  const remove = async () => {
    if (!removing) return
    const target = removing
    setRemoving(null)
    try {
      await setAdmin(target.user_id, false)
      toast('Admin removed')
      admins.refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Admins</h1>
      <p className="mt-1 text-text-secondary">Admins see everything: members, emails, activity, funding and moderation.</p>

      <Card className="mt-6 p-5">
        <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Add an admin by email" hint="They must have signed up already." className="flex-1">
            {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" />}
          </Field>
          <Button type="submit" loading={adding} icon={<UserPlus size={16} />} className="sm:mb-6">
            Add admin
          </Button>
        </form>
      </Card>

      <div className="mt-6">
        {admins.loading ? (
          <ListSkeleton rows={2} />
        ) : admins.error ? (
          <ErrorState message={admins.error} onRetry={admins.reload} />
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {(admins.data ?? []).map((a) => (
              <div key={a.user_id} className="flex items-center gap-3 px-4 py-3">
                <Link to={`/u/${a.user_id}`}>
                  <Avatar name={a.profile?.name} src={a.profile?.avatar_url} size="md" lastSeen={a.profile?.last_seen_at} showStatus seed={a.user_id} />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-semibold text-text-primary">
                    {a.profile?.name ?? 'Admin'} <ShieldCheck size={14} className="text-accent" />
                    {a.user_id === user?.id && <span className="text-xs font-medium text-text-muted">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    Admin since {formatDate(a.created_at)} · {lastActiveLabel(a.profile?.last_seen_at)}
                  </p>
                </div>
                {a.user_id !== user?.id && (
                  <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => setRemoving(a)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!removing}
        danger
        title="Remove admin access?"
        body={`${removing?.profile?.name ?? 'This person'} will lose access to the admin panel.`}
        confirmLabel="Remove"
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </div>
  )
}
