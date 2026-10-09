import { useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/errors'
import { requestAccountDeletion } from '../services/accountDeletion.service'
import { SimplePage } from '../components/layout/SimplePage'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Textarea } from '../components/ui/Field'

export default function DeactivateAccount() {
  const { user, signOut } = useAuth()
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || confirmText !== 'DELETE') return
    setSubmitting(true)
    setError(null)
    try {
      await requestAccountDeletion(user.id, reason.trim())
      setDone(true)
      window.setTimeout(() => signOut(), 2500)
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <SimplePage title="Request received">
        <Card className="flex flex-col items-center p-8 text-center">
          <CheckCircle2 size={28} className="text-accent" />
          <p className="mt-3 text-text-primary">We've received your request and will delete your account and data.</p>
          <p className="mt-1 text-sm text-text-secondary">Signing you out…</p>
        </Card>
      </SimplePage>
    )
  }

  return (
    <SimplePage title="Deactivate account">
      <Card className="flex gap-3 border-danger/25 bg-danger/[0.05] p-4">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-danger" />
        <p className="text-sm text-text-primary">
          This asks us to delete your account, projects, roadmaps, posts and messages. It can't be undone once processed.
        </p>
      </Card>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
        <Field label="Why are you leaving?" optional>
          {(id) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Your feedback helps us improve." />}
        </Field>
        <Field label={<>Type <span className="font-semibold text-text-primary">DELETE</span> to confirm</>}>
          {(id) => <Input id={id} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" autoCapitalize="characters" />}
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="danger" size="lg" loading={submitting} disabled={confirmText !== 'DELETE'} fullWidth>
          Request account deletion
        </Button>
      </form>
    </SimplePage>
  )
}
