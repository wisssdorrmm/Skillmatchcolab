import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import type { Profile } from '../types/database'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  /** true until we know who you are (and have your profile, if signed in) */
  loading: boolean
  /** set when the profile couldn't be loaded (e.g. server unreachable) */
  profileError: string | null
  refreshProfile: () => Promise<void>
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const loadedFor = useRef<string | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    setProfileError(null)
    try {
      const [{ data, error }, adminRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('app_admins').select('user_id').eq('user_id', userId).maybeSingle(),
      ])
      if (error) throw error
      setProfile((data as Profile | null) ?? null)
      setIsAdmin(!adminRes.error && !!adminRes.data)
      loadedFor.current = userId
    } catch (err) {
      setProfileError(errorMessage(err, 'Could not load your profile.'))
    } finally {
      setProfileReady(true)
    }
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setSessionReady(true)
      if (data.session?.user.id) loadProfile(data.session.user.id)
      else setProfileReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      const uid = next?.user.id
      if (!uid) {
        loadedFor.current = null
        setProfile(null)
        setIsAdmin(false)
        setProfileReady(true)
        return
      }
      // Token refreshes fire this too — only refetch when the user actually changed.
      if (loadedFor.current !== uid) {
        setProfileReady(false)
        // Defer so we never call Supabase from inside its own auth callback.
        window.setTimeout(() => loadProfile(uid), 0)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    const uid = session?.user.id
    if (uid) await loadProfile(uid)
  }, [session?.user.id, loadProfile])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { error: error ? errorMessage(error) : null, needsConfirmation: !error && !data.session }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? errorMessage(error) : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isAdmin,
        loading: !sessionReady || !profileReady,
        profileError,
        refreshProfile,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
