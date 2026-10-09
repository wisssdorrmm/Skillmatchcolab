import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { Field, Input, PasswordInput } from '../components/ui/Field'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) setError(error)
    // On success the GuestOnly guard redirects into the app.
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to keep building.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email">
          {(id) => (
            <Input id={id} type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </Field>
        <Field
          label={
            <span className="flex w-full items-center justify-between">
              Password
            </span>
          }
        >
          {(id) => (
            <PasswordInput id={id} required autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Field>
        <div className="-mt-1 text-right">
          <Link to="/forgot-password" className="text-[13px] font-medium text-accent hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

        <Button type="submit" size="lg" loading={loading} fullWidth>
          Log in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-text-secondary">
        New here?{' '}
        <Link to="/signup" className="font-semibold text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
