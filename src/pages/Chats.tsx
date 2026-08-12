import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listMyChatThreads, type ChatThread } from '../services/members.service'
import { getReadTimestamps } from '../services/chatReads.service'
import { listMyOwnerThreads, listMyApplicantThreads } from '../services/directMessages.service'
import { timeAgo } from '../utils/timeAgo'

export default function Chats() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [readMap, setReadMap] = useState<Record<string, string>>({})
  const [dmThreads, setDmThreads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      listMyChatThreads(user.id),
      getReadTimestamps(user.id),
      listMyOwnerThreads(user.id),
      listMyApplicantThreads(user.id),
    ])
      .then(([teamThreads, reads, ownerThreads, applicantThreads]) => {
        setThreads(teamThreads)
        setReadMap(reads)
        // Merge owner-side and applicant-side threads, dedupe by project+applicant
        const seen = new Set<string>()
        const merged: any[] = []
        ;[...ownerThreads, ...applicantThreads].forEach((t) => {
          const key = `${t.project_id}:${t.applicant_id}`
          if (seen.has(key)) return
          seen.add(key)
          merged.push(t)
        })
        setDmThreads(merged)
      })
      .finally(() => setLoading(false))
  }, [user])

  const isUnread = (t: ChatThread) => {
    if (!t.last_message_at) return false
    const lastRead = readMap[t.project_id]
    return !lastRead || t.last_message_at > lastRead
  }

  return (
    <div className="mx-auto max-w-md px-6 py-6">
      <h1 className="mb-5 text-xl font-semibold text-text-primary">Chats</h1>

      {loading ? (
        <p className="py-10 text-center text-sm text-text-muted">Loading…</p>
      ) : (
        <>
          <h2 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-text-muted">Team Chats</h2>
          {threads.length === 0 ? (
            <p className="mb-6 rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">
              No team chats yet. Join or create a project to start one.
            </p>
          ) : (
            <div className="mb-6 flex flex-col gap-2">
              {threads.map((t) => {
                const unread = isUnread(t)
                return (
                  <button
                    key={t.project_id}
                    onClick={() => navigate(`/chats/${t.project_id}`)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:border-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                        <p className={`truncate ${unread ? 'font-semibold' : 'font-medium'} text-text-primary`}>
                          {t.project_title}
                        </p>
                      </div>
                      <p className="truncate text-sm text-text-secondary">
                        {t.last_message ?? 'No messages yet'}
                      </p>
                    </div>
                    {t.last_message_at && (
                      <span className="shrink-0 text-[11px] text-text-muted">{timeAgo(t.last_message_at)}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          <h2 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-text-muted">
            Direct Messages
          </h2>
          {dmThreads.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">
              No direct conversations yet. These start when you or a project owner message
              about an application.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {dmThreads.map((t: any) => (
                <button
                  key={`${t.project_id}:${t.applicant_id}`}
                  onClick={() => navigate(`/project/${t.project_id}/messages/${t.applicant_id}`)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:border-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-primary">
                      {t.projects?.title ?? 'Project'}
                      {t.applicant?.name ? ` · ${t.applicant.name}` : ''}
                    </p>
                    <p className="truncate text-sm text-text-secondary">{t.text}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-text-muted">{timeAgo(t.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
