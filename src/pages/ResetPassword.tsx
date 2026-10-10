import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { Field, PasswordInput } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'

/** Landing page for the email reset link — the link signs you in, then you pick a new password. */
export default function ResetPassword() {
  const navigate = useNavigate()
  const toast = useToast()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session))
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError("Those passwords don't match.")
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(errorMessage(error))
    toast('Password updated')
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout title="Choose a new password">
      {!ready ? (
        <p className="text-center text-sm text-text-secondary">
          Open this page from the link in your reset email.{' '}
          <Link to="/forgot-password" className="font-semibold text-accent hover:underline">
            Send a new link
          </Link>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="New password" hint="At least 8 characters.">
            {(id) => <PasswordInput id={id} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          <Field label="Confirm new password">
            {(id) => <PasswordInput id={id} required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          </Field>
          {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-center text-sm text-danger" role="alert">{error}</p>}
          <Button type="submit" size="lg" loading={loading} fullWidth>
            Save password
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
