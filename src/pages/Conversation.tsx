import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useUnread } from '../context/UnreadContext'
import { errorMessage } from '../lib/errors'
import { lastActiveLabel } from '../lib/format'
import {
  getConversationPartner,
  listConversationMessages,
  markConversationRead,
  sendConversationMessage,
  subscribeToConversation,
} from '../services/conversations.service'
import type { ConversationMessage, ProfileLite } from '../types/database'
import { Avatar } from '../components/ui/Avatar'
import { ErrorState, Spinner } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { Bubble, ChatHeader, ChatScreen, Composer, DaySeparator } from '../components/chat/ChatParts'
import { useStickToBottom, withDays } from '../components/chat/chatUtils'

export default function Conversation() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const unread = useUnread()
  const toast = useToast()
  const uid = user?.id ?? ''

  const [partner, setPartner] = useState<ProfileLite | null | undefined>(undefined)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useStickToBottom(messages.length)
  const refreshUnread = unread.refresh

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getConversationPartner(id, uid), listConversationMessages(id)])
      .then(([p, list]) => {
        if (cancelled) return
        setPartner(p)
        setMessages(list)
        markConversationRead(id).then(refreshUnread).catch(() => {})
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false))

    const ch = subscribeToConversation(id, (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
      if (m.sender_id !== uid) markConversationRead(id).then(refreshUnread).catch(() => {})
    })
    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [id, uid, refreshUnread])

  if (!loading && partner === null) return <Navigate to="/messages" replace />

  const send = async (text: string) => {
    try {
      const m = await sendConversationMessage(id, uid, text)
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    } catch (err) {
      toast(errorMessage(err), 'error')
      throw err
    }
  }

  const lastSeen = partner?.show_online ? partner.last_seen_at : null

  return (
    <ChatScreen
      scrollRef={scrollRef}
      header={
        <ChatHeader
          backTo="/messages"
          left={
            partner ? (
              <Link to={`/u/${partner.id}`}>
                <Avatar name={partner.name} src={partner.avatar_url} size="md" lastSeen={lastSeen} showStatus seed={partner.id} />
              </Link>
            ) : null
          }
          title={partner ? <Link to={`/u/${partner.id}`}>{partner.name}</Link> : '…'}
          subtitle={partner ? (partner.show_online ? lastActiveLabel(partner.last_seen_at) : (partner.primary_role ?? 'Builder')) : undefined}
        />
      }
      composer={<Composer placeholder={partner?.name ? `Message ${partner.name}` : 'Message'} onSend={send} maxLength={4000} />}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          {partner && <Avatar name={partner.name} src={partner.avatar_url} size="xl" seed={partner.id} />}
          <p className="mt-3 font-semibold text-text-primary">Say hi to {partner?.name}</p>
          <p className="mt-1 max-w-xs text-sm text-text-secondary">Introduce yourself and what you're working on.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {withDays(messages).map((row) =>
            row.kind === 'day' ? (
              <DaySeparator key={`d-${row.iso}`} iso={row.iso} />
            ) : (
              <Bubble key={row.item.id} mine={row.item.sender_id === uid} text={row.item.body} time={row.item.created_at} />
            ),
          )}
        </div>
      )}
    </ChatScreen>
  )
}
