import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Hash, Heart, Lock, Reply, ShieldCheck, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/cn'
import { errorMessage } from '../lib/errors'
import { formatTime } from '../lib/format'
import {
  deleteRoomMessage,
  getRoomBySlug,
  getRoomMessage,
  listRoomMessages,
  markRoomRead,
  postRoomMessage,
  setMessageLike,
  subscribeToRoom,
} from '../services/community.service'
import type { CommunityMessage, CommunityRoom as Room } from '../types/database'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/Modal'
import { ErrorState, Spinner } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { ChatHeader, ChatScreen, Composer, DaySeparator } from '../components/chat/ChatParts'
import { useStickToBottom, withDays } from '../components/chat/chatUtils'
import { useUnread } from '../context/UnreadContext'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'
import { RichText } from '../components/ui/RichText'

export default function CommunityRoom() {
  const { slug = '' } = useParams()
  const { user, isAdmin } = useAuth()
  const toast = useToast()
  const unread = useUnread()
  const uid = user?.id ?? ''

  const [room, setRoom] = useState<Room | null | undefined>(undefined)
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null)
  const [toDelete, setToDelete] = useState<CommunityMessage | null>(null)
  const scrollRef = useStickToBottom(messages.length)
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase
      .from('app_admins')
      .select('user_id')
      .then(({ data }) => setAdminIds(new Set((data ?? []).map((r) => r.user_id as string))))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await getRoomBySlug(slug)
      setRoom(r)
      if (!r) return
      const list = await listRoomMessages(r.id)
      setMessages(list)
      setHasMore(list.length >= 50)
      markRoomRead(r.id).catch(() => {})
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!room) return
    const ch = subscribeToRoom(room.id, {
      onInsert: async (id) => {
        const msg = await getRoomMessage(id).catch(() => null)
        if (!msg) return
        setMessages((prev) => (prev.some((m) => m.id === id) ? prev : [...prev, msg]))
        markRoomRead(room.id).catch(() => {})
      },
      onDelete: (id) => setMessages((prev) => prev.filter((m) => m.id !== id)),
    })
    return () => {
      supabase.removeChannel(ch)
    }
  }, [room])

  if (room === null) return <Navigate to="/community" replace />

  const loadEarlier = async () => {
    if (!room || !messages.length) return
    setLoadingMore(true)
    try {
      const older = await listRoomMessages(room.id, messages[0].created_at)
      setMessages((prev) => [...older, ...prev])
      setHasMore(older.length >= 50)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  const send = async (text: string) => {
    if (!room) return
    try {
      const msg = await postRoomMessage(room.id, uid, text, replyTo?.id)
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      setReplyTo(null)
      unread.refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
      throw err
    }
  }

  const toggleLike = async (m: CommunityMessage) => {
    const liked = m.likes.some((l) => l.user_id === uid)
    const patch = (on: boolean) =>
      setMessages((prev) =>
        prev.map((x) =>
          x.id === m.id ? { ...x, likes: on ? [...x.likes.filter((l) => l.user_id !== uid), { user_id: uid }] : x.likes.filter((l) => l.user_id !== uid) } : x,
        ),
      )
    patch(!liked)
    try {
      await setMessageLike(m.id, uid, !liked)
    } catch (err) {
      patch(liked)
      toast(errorMessage(err), 'error')
    }
  }

  const remove = async () => {
    if (!toDelete) return
    const target = toDelete
    setToDelete(null)
    try {
      await deleteRoomMessage(target.id)
      setMessages((prev) => prev.filter((m) => m.id !== target.id))
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const canPost = !!room && (!room.is_locked || isAdmin)

  return (
    <ChatScreen
      scrollRef={scrollRef}
      header={
        <ChatHeader
          backTo="/community"
          left={<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-secondary">{room?.is_locked ? <Lock size={18} /> : <Hash size={18} />}</span>}
          title={room ? room.name : '…'}
          subtitle={room?.description}
        />
      }
      composer={
        <Composer
          placeholder={room ? `Message #${room.name}` : 'Message'}
          onSend={send}
          disabled={!loading && !canPost}
          disabledText="Only admins post here. Reply in #general."
          replyTo={replyTo ? { name: replyTo.author?.name ?? 'someone', body: replyTo.body } : null}
          onCancelReply={() => setReplyTo(null)}
        />
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-text-secondary">
            <Hash size={24} />
          </span>
          <p className="mt-3 font-semibold text-text-primary">Welcome to #{room?.name}</p>
          <p className="mt-1 max-w-xs text-sm text-text-secondary">{canPost ? 'Be the first to say something. Posting keeps your streak alive.' : 'Nothing posted yet.'}</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {hasMore && (
            <Button variant="ghost" size="sm" loading={loadingMore} onClick={loadEarlier} className="mx-auto mb-2">
              Load earlier messages
            </Button>
          )}
          {withDays(messages).map((row) =>
            row.kind === 'day' ? (
              <DaySeparator key={`d-${row.iso}`} iso={row.iso} />
            ) : (
              <MessageRow
                key={row.item.id}
                m={row.item}
                uid={uid}
                isAdminAuthor={adminIds.has(row.item.user_id)}
                canDelete={row.item.user_id === uid || isAdmin}
                onLike={() => toggleLike(row.item)}
                onReply={() => setReplyTo(row.item)}
                onDelete={() => setToDelete(row.item)}
              />
            ),
          )}
        </div>
      )}
      <ConfirmDialog open={!!toDelete} danger title="Delete this message?" confirmLabel="Delete" onConfirm={remove} onClose={() => setToDelete(null)} />
    </ChatScreen>
  )
}

function MessageRow({
  m,
  uid,
  isAdminAuthor,
  canDelete,
  onLike,
  onReply,
  onDelete,
}: {
  m: CommunityMessage
  uid: string
  isAdminAuthor: boolean
  canDelete: boolean
  onLike: () => void
  onReply: () => void
  onDelete: () => void
}) {
  const liked = m.likes.some((l) => l.user_id === uid)
  return (
    <div className="group -mx-2 flex gap-3 rounded-xl px-2 py-2.5 hover:bg-surface/60">
      <Link to={`/u/${m.user_id}`} className="shrink-0">
        <Avatar name={m.author?.name} src={m.author?.avatar_url} size="md" lastSeen={m.author?.show_online ? m.author.last_seen_at : null} showStatus seed={m.user_id} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <Link to={`/u/${m.user_id}`} className="truncate text-[15px] font-semibold text-text-primary hover:underline">
            {m.author?.name ?? 'Builder'}
          </Link>
          <VerifiedBadge show={m.author?.is_verified} size={15} className="self-center" />
          {m.author?.is_official && (
            <span className="self-center rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">Official</span>
          )}
          {isAdminAuthor && <ShieldCheck size={14} className="shrink-0 text-accent" aria-label="Admin" />}
          <span className="shrink-0 text-xs text-text-muted">{formatTime(m.created_at)}</span>
        </div>
        {m.reply && (
          <div className="mt-1 rounded-lg border-l-2 border-border-strong bg-surface-2/60 px-2.5 py-1.5 text-xs text-text-secondary">
            <span className="font-semibold">{m.reply.author?.name ?? 'Someone'}</span>: <span className="line-clamp-1">{m.reply.body}</span>
          </div>
        )}
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-text-primary">
          <RichText text={m.body} />
        </p>
        <div className="mt-1.5 flex items-center gap-1 text-xs">
          <button
            onClick={onLike}
            aria-pressed={liked}
            aria-label={liked ? 'Unlike' : 'Like'}
            className={cn('inline-flex h-8 items-center gap-1 rounded-lg px-2 font-medium', liked ? 'text-accent' : 'text-text-muted hover:bg-surface-2 hover:text-text-primary')}
          >
            <Heart size={15} className={liked ? 'fill-accent' : ''} /> {m.likes.length > 0 && m.likes.length}
          </button>
          <button onClick={onReply} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 font-medium text-text-muted hover:bg-surface-2 hover:text-text-primary">
            <Reply size={15} /> Reply
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              aria-label="Delete message"
              className="ml-auto inline-flex h-8 items-center rounded-lg px-2 text-text-muted opacity-100 hover:bg-danger/10 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
