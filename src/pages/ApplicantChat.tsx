import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  listDirectMessages,
  sendDirectMessage,
  subscribeToDirectMessages,
  type DirectMessage,
} from '../services/directMessages.service'
import { getProjectById } from '../services/projects.service'
import { getProfile } from '../services/profiles.service'

export default function ApplicantChat() {
  const { projectId, applicantId } = useParams<{ projectId: string; applicantId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [projectTitle, setProjectTitle] = useState('')
  const [otherPartyName, setOtherPartyName] = useState('')
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isOwnerView = user?.id !== applicantId

  useEffect(() => {
    if (!projectId || !applicantId || !user) return

    Promise.all([
      listDirectMessages(projectId, applicantId),
      getProjectById(projectId),
      getProfile(isOwnerView ? applicantId : user.id),
    ])
      .then(([msgs, project, otherProfile]) => {
        setMessages(msgs)
        setProjectTitle(project?.title ?? '')
        // Owner sees applicant's name; applicant sees the project owner's name.
        if (isOwnerView) {
          setOtherPartyName(otherProfile?.name ?? 'Applicant')
        } else {
          setOtherPartyName(project?.owner?.name ?? 'Project owner')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    const channel = subscribeToDirectMessages(projectId, applicantId, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
    })

    return () => {
      channel.unsubscribe()
    }
  }, [projectId, applicantId, user, isOwnerView])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!projectId || !applicantId || !user || !text.trim()) return
    const body = text.trim()
    setText('')
    setSending(true)
    try {
      await sendDirectMessage(projectId, applicantId, user.id, body)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{otherPartyName}</p>
          <p className="truncate text-xs text-text-muted">{projectTitle}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <p className="py-10 text-center text-sm text-text-muted">Loading…</p>
        ) : error ? (
          <p className="py-10 text-center text-sm text-danger">{error}</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-secondary">
            No messages yet. {isOwnerView ? 'Ask them a question before deciding.' : 'Say hello 👋'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const isMine = m.sender_id === user?.id
              return (
                <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
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
          placeholder={`Message ${otherPartyName}...`}
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
