import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listMyChatThreads, type ChatThread } from '../services/members.service'

export default function Chats() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    listMyChatThreads(user.id)
      .then(setThreads)
      .finally(() => setLoading(false))
  }, [user])

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <h1 className="mb-5 text-xl font-semibold text-text-primary">Chats</h1>

      {loading ? (
        <p className="py-10 text-center text-sm text-text-muted">Loading…</p>
      ) : threads.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-secondary">
          No team chats yet. Join or create a project to start one.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {threads.map((t) => (
            <button
              key={t.project_id}
              onClick={() => navigate(`/chats/${t.project_id}`)}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 text-left hover:border-accent/50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-text-primary">{t.project_title}</p>
                <p className="truncate text-sm text-text-secondary">
                  {t.last_message ?? 'No messages yet'}
                </p>
              </div>
              {t.last_message_at && (
                <span className="shrink-0 pl-2 text-[11px] text-text-muted">
                  {new Date(t.last_message_at).toLocaleDateString()}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
