import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FolderKanban } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/errors'
import { listMessages, sendMessage, subscribeToMessages, type MessageWithSender } from '../services/messages.service'
import { markChatRead } from '../services/chatReads.service'
import { getProject, type ProjectDetail } from '../services/projects.service'
import { Avatar } from '../components/ui/Avatar'
import { ErrorState, Spinner } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { ChatHeader, ChatScreen, Composer, DaySeparator } from '../components/chat/ChatParts'
import { useStickToBottom, withDays } from '../components/chat/chatUtils'
import { cn } from '../lib/cn'
import { formatTime } from '../lib/format'

export default function TeamChat() {
  const { projectId = '' } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const uid = user?.id ?? ''

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useStickToBottom(messages.length)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProject(projectId), listMessages(projectId)])
      .then(([p, list]) => {
        if (cancelled) return
        setProject(p)
        setMessages(list)
        markChatRead(uid, projectId).catch(() => {})
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false))

    const ch = subscribeToMessages(projectId, (m) => {
      // Realtime rows have no sender profile — fill it from the team list.
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev
        return [...prev, { ...m, sender: null }]
      })
      markChatRead(uid, projectId).catch(() => {})
    })
    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [projectId, uid])

  const isMember = !!project?.project_members.some((m) => m.user_id === uid)
  const memberById = new Map(project?.project_members.map((m) => [m.user_id, m.profile]) ?? [])

  const send = async (text: string) => {
    try {
      const m = await sendMessage(projectId, uid, text)
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    } catch (err) {
      toast(errorMessage(err), 'error')
      throw err
    }
  }

  return (
    <ChatScreen
      scrollRef={scrollRef}
      header={
        <ChatHeader
          backTo="/messages"
          left={
            <Link to={`/project/${projectId}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-secondary">
              <FolderKanban size={18} />
            </Link>
          }
          title={project ? <Link to={`/project/${projectId}`}>{project.title}</Link> : '…'}
          subtitle={project ? `Team chat · ${project.project_members.length} members` : undefined}
        />
      }
      composer={<Composer placeholder="Message your team" onSend={send} disabled={!loading && !isMember} disabledText="Only team members can post here." />}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : messages.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-semibold text-text-primary">Your team chat is ready</p>
          <p className="mt-1 text-sm text-text-secondary">Plan the next roadmap step together.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {withDays(messages).map((row) => {
            if (row.kind === 'day') return <DaySeparator key={`d-${row.iso}`} iso={row.iso} />
            const m = row.item
            const who = m.sender ?? memberById.get(m.sender_id) ?? null
            const mine = m.sender_id === uid
            return (
              <div key={m.id} className={cn('flex gap-2.5 py-1.5', mine && 'flex-row-reverse')}>
                <Avatar name={who?.name} src={who?.avatar_url} size="sm" seed={m.sender_id} />
                <div className={cn('flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
                  {!mine && <span className="mb-0.5 text-xs font-semibold text-text-secondary">{who?.name ?? 'Teammate'}</span>}
                  <div className={cn('whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px]', mine ? 'rounded-tr-md bg-accent text-accent-ink' : 'rounded-tl-md bg-surface-2 text-text-primary')}>
                    {m.text}
                  </div>
                  <span className="mt-0.5 text-[11px] text-text-muted">{formatTime(m.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ChatScreen>
  )
}
