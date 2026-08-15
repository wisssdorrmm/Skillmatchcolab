import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  listMessages,
  sendMessage,
  subscribeToMessages,
  type MessageWithSender,
} from '../services/messages.service'
import { getProjectById } from '../services/projects.service'
import { markChatRead } from '../services/chatReads.service'

export default function TeamChat() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [projectTitle, setProjectTitle] = useState('')
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!projectId || !user) return

    Promise.all([listMessages(projectId), getProjectById(projectId)])
      .then(([msgs, project]) => {
        setMessages(msgs)
        setProjectTitle(project?.title ?? '')
      })
      .finally(() => setLoading(false))

    markChatRead(user.id, projectId).catch(() => {})

    const channel = subscribeToMessages(projectId, (message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message as MessageWithSender]
      )
      markChatRead(user.id, projectId).catch(() => {})
    })

    return () => {
      channel.unsubscribe()
    }
  }, [projectId, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!projectId || !user || !text.trim()) return
    const body = text.trim()
    setText('')
    setSending(true)
    try {
      const sent = await sendMessage(projectId, user.id, body)
      // Show it immediately — don't wait on the realtime round-trip, which
      // only needs to update *other* people's screens. The dedupe check in
      // the realtime handler (by id) means this won't double up when that
      // event arrives a moment later.
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-medium text-text-primary">{projectTitle || 'Team Chat'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="py-10 text-center text-sm text-text-muted">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-secondary">No messages yet. Say hi 👋</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const isMine = m.sender_id === user?.id
              return (
                <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && (
                    <span className="mb-0.5 px-1 text-[11px] text-text-muted">
                      {m.sender?.name ?? 'Member'}
                    </span>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      isMine ? 'bg-accent text-white' : 'bg-surface text-text-primary'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="mt-0.5 px-1 text-[10px] text-text-muted">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${projectTitle || 'team'}...`}
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
