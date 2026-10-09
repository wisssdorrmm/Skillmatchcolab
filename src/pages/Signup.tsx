import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { Field, Input, PasswordInput } from '../components/ui/Field'
import { isDisposableEmail } from '../utils/disposableEmail'
import { hasValidMxRecords } from '../utils/validateEmailDomain'

export default function Signup() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkInbox, setCheckInbox] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const cleanEmail = email.trim()
    if (password.length < 8) return setError('Use at least 8 characters for your password.')
    if (password !== confirm) return setError("Those passwords don't match.")
    if (isDisposableEmail(cleanEmail)) return setError('Please use a real email address, not a temporary one.')

    setLoading(true)
    if (!(await hasValidMxRecords(cleanEmail))) {
      setLoading(false)
      return setError("That email domain can't receive mail. Check for typos.")
    }
    const { error, needsConfirmation } = await signUp(cleanEmail, password)
    setLoading(false)
    if (error) return setError(error)
    if (needsConfirmation) setCheckInbox(true)
    // Otherwise we're signed in and the guard sends us to onboarding.
  }

  if (checkInbox) {
    return (
      <AuthLayout title="Check your inbox" subtitle={`We sent a confirmation link to ${email.trim()}.`}>
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center">
          <MailCheck size={28} className="text-accent" />
          <p className="mt-3 text-sm text-text-secondary">Tap the link in the email, then come back and log in.</p>
        </div>
        <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-accent hover:underline">
          Back to log in
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join builders shipping projects together.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email">
          {(id) => (
            <Input id={id} type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          {(id) => (
            <PasswordInput id={id} required autoComplete="new-password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Field>
        <Field label="Confirm password">
          {(id) => (
            <PasswordInput id={id} required autoComplete="new-password" placeholder="Type it again" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          )}
        </Field>

        {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

        <Button type="submit" size="lg" loading={loading} fullWidth>
          Create account
        </Button>
        <p className="text-center text-xs text-text-muted">
          By joining you agree to our{' '}
          <Link to="/terms" className="underline hover:text-text-secondary">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline hover:text-text-secondary">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
