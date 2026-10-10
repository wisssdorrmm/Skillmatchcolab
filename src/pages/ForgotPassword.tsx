import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) return setError(errorMessage(error))
    setSent(true)
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      {sent ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface-2 p-6 text-center">
          <MailCheck size={28} className="text-accent" />
          <p className="mt-3 text-sm text-text-secondary">If an account exists for {email.trim()}, a reset link is on its way.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email">
            {(id) => (
              <Input id={id} type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
          </Field>
          {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-center text-sm text-danger" role="alert">{error}</p>}
          <Button type="submit" size="lg" loading={loading} fullWidth>
            Send reset link
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-accent hover:underline">
        Back to log in
      </Link>
    </AuthLayout>
  )
}
