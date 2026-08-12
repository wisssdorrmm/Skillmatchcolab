import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
  type Notification,
} from '../services/notifications.service'
import { timeAgo } from '../utils/timeAgo'

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    getUnreadCount(user.id).then(setUnread).catch(() => {})

    const channel = subscribeToNotifications(user.id, () => {
      setUnread((n) => n + 1)
    })
    return () => {
      channel.unsubscribe()
    }
  }, [user])

  const handleOpen = async () => {
    if (!user) return
    setOpen((v) => !v)
    if (!open) {
      setLoading(true)
      try {
        const list = await listNotifications(user.id)
        setNotifications(list)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      markAsRead(n.id).catch(() => {})
      setUnread((count) => Math.max(0, count - 1))
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    }
    setOpen(false)
    if (n.project_id) navigate(`/project/${n.project_id}`)
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    await markAllAsRead(user.id).catch(() => {})
    setUnread(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center text-text-secondary hover:text-text-primary"
        aria-label="Notifications"
      >
        <Bell size={21} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 max-w-[85vw] rounded-xl border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-medium text-text-primary">Notifications</span>
              {unread > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-accent hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <p className="p-4 text-center text-sm text-text-muted">Loading…</p>
              ) : notifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-text-secondary">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface-hover ${
                      !n.is_read ? 'bg-accent/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                      <span className="text-sm font-medium text-text-primary">{n.title}</span>
                    </div>
                    {n.body && <p className="line-clamp-2 pl-3.5 text-xs text-text-secondary">{n.body}</p>}
                    <span className="pl-3.5 text-[11px] text-text-muted">{timeAgo(n.created_at)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
