import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { getUnreadCount, subscribeToNotifications } from '../services/notifications.service'
import { getUnreadDmCount, subscribeToMyDms } from '../services/conversations.service'

interface UnreadValue {
  notifications: number
  dms: number
  refresh: () => void
}

const UnreadContext = createContext<UnreadValue>({ notifications: 0, dms: 0, refresh: () => {} })

/** Live badge counts for the bell and the Messages tab. */
export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState(0)
  const [dms, setDms] = useState(0)

  const refresh = useCallback(() => {
    if (!user) return
    getUnreadCount(user.id).then(setNotifications).catch(() => {})
    getUnreadDmCount().then(setDms).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) {
      setNotifications(0)
      setDms(0)
      return
    }
    refresh()
    const n = subscribeToNotifications(user.id, () => setNotifications((c) => c + 1))
    const d = subscribeToMyDms(user.id, (m) => {
      if (m.sender_id !== user.id) setDms((c) => c + 1)
    })
    // Realtime can miss events (sleep, network blips) — resync when the tab comes back.
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    const poll = window.setInterval(refresh, 60_000)
    return () => {
      supabase.removeChannel(n)
      supabase.removeChannel(d)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(poll)
    }
  }, [user, refresh])

  return <UnreadContext.Provider value={{ notifications, dms, refresh }}>{children}</UnreadContext.Provider>
}

export function useUnread() {
  return useContext(UnreadContext)
}
