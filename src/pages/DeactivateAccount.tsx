import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requestAccountDeletion } from '../services/accountDeletion.service'

export default function DeactivateAccount() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError(null)
    try {
      await requestAccountDeletion(user.id, reason)
      setDone(true)
      setTimeout(() => signOut(), 2500)
    } catch (err: any) {
      setError(err.message ?? 'Could not submit request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-bg px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <AlertTriangle size={24} />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-text-primary">Request received</h1>
        <p className="text-sm text-text-secondary">
          We've received your account deletion request and will process it. You'll be signed out
          now.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg px-6 py-6">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">Deactivate Account</h1>
      </div>

      <div className="mb-5 rounded-xl border border-danger/30 bg-danger/5 p-4">
        <p className="text-sm text-danger">
          This submits a request to delete your account and all associated data — projects you
          own, applications, messages, and your profile. This can't be easily undone once
          processed.
        </p>
      </div>

      {!confirming ? (
        <form onSubmit={(e) => { e.preventDefault(); setConfirming(true) }} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Why are you leaving? (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Helps us improve — totally optional"
              className="w-full resize-none rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-danger py-3 text-sm font-medium text-danger hover:bg-danger/10"
          >
            Continue
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Are you sure? Type <span className="font-semibold text-text-primary">DELETE</span> to
            confirm.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-danger focus:outline-none"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={submitting || confirmText !== 'DELETE'}
            className="rounded-lg bg-danger py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Permanently Delete My Account'}
          </button>
        </form>
      )}
    </div>
  )
}
