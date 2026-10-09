import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/errors'
import { listDirectMessages, sendDirectMessage, subscribeToDirectMessages, type DirectMessage } from '../services/directMessages.service'
import { getProject, type ProjectDetail } from '../services/projects.service'
import { getProfile } from '../services/profiles.service'
import type { Profile } from '../types/database'
import { Avatar } from '../components/ui/Avatar'
import { ErrorState, Spinner } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { Bubble, ChatHeader, ChatScreen, Composer, DaySeparator } from '../components/chat/ChatParts'
import { useStickToBottom, withDays } from '../components/chat/chatUtils'

/** Pre-acceptance thread between a project owner and one applicant. */
export default function ApplicantChat() {
  const { projectId = '', applicantId = '' } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const uid = user?.id ?? ''
  const ownerView = uid !== applicantId

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [applicant, setApplicant] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useStickToBottom(messages.length)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProject(projectId), getProfile(applicantId), listDirectMessages(projectId, applicantId)])
      .then(([p, a, list]) => {
        if (cancelled) return
        setProject(p)
        setApplicant(a)
        setMessages(list)
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false))
    const ch = subscribeToDirectMessages(projectId, applicantId, (m) => setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m])))
    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [projectId, applicantId])

  const other = ownerView
    ? { id: applicantId, name: applicant?.name ?? 'Applicant', avatar: applicant?.avatar_url ?? null }
    : { id: project?.owner?.id ?? '', name: project?.owner?.name ?? 'Project owner', avatar: project?.owner?.avatar_url ?? null }

  const send = async (text: string) => {
    try {
      const m = await sendDirectMessage(projectId, applicantId, uid, text)
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
          left={<Avatar name={other.name} src={other.avatar} size="md" seed={other.id} />}
          title={other.name}
          subtitle={project ? <Link to={`/project/${projectId}`}>About {project.title}</Link> : undefined}
        />
      }
      composer={<Composer placeholder={`Message ${other.name}`} onSend={send} />}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : messages.length === 0 ? (
        <p className="py-16 text-center text-sm text-text-secondary">
          {ownerView ? 'Ask the applicant a question about their application.' : 'Introduce yourself to the project owner.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {withDays(messages.map((m) => ({ ...m, created_at: m.created_at }))).map((row) =>
            row.kind === 'day' ? (
              <DaySeparator key={`d-${row.iso}`} iso={row.iso} />
            ) : (
              <Bubble key={row.item.id} mine={row.item.sender_id === uid} text={row.item.text} time={row.item.created_at} />
            ),
          )}
        </div>
      )}
    </ChatScreen>
  )
}
