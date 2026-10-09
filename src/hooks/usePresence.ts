import { useEffect } from 'react'
import { touchPresence } from '../services/stats.service'

/** Ping "I'm here" every minute while the tab is visible (powers online dots + active-user stats). */
export function usePresence(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const ping = () => {
      if (document.visibilityState === 'visible') touchPresence().catch(() => {})
    }
    ping()
    const t = window.setInterval(ping, 60_000)
    document.addEventListener('visibilitychange', ping)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', ping)
    }
  }, [enabled])
}
