import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="flex h-screen flex-col justify-center bg-bg px-6">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold text-text-primary">Reset password</h1>
        <p className="mb-8 text-sm text-text-secondary">
          We'll email you a link to reset your password.
        </p>

        {sent ? (
          <p className="text-sm text-success">Check your inbox for a reset link.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-accent py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-text-secondary">
          <Link to="/login" className="font-medium text-accent hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  )
}
