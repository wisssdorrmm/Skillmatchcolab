import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Hash, Lock, Trash2, Unlock } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { errorMessage } from '../../lib/errors'
import { timeAgo } from '../../lib/format'
import { deleteRoomMessage, listRecentPosts, listRooms, type RecentPost } from '../../services/community.service'
import { createRoom, deleteRoom, updateRoom } from '../../services/admin.service'
import type { CommunityRoom } from '../../types/database'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input, Select, Toggle } from '../../components/ui/Field'
import { ConfirmDialog } from '../../components/ui/Modal'
import { ErrorState, ListSkeleton } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'

const CATEGORIES = ['Start here', 'Build', 'Opportunities', 'Stacks', 'Community']

export default function AdminCommunity() {
  const toast = useToast()
  const rooms = useAsync(listRooms, [])
  const posts = useAsync(() => listRecentPosts(40), [])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Stacks')
  const [locked, setLocked] = useState(false)
  const [creating, setCreating] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<CommunityRoom | null>(null)
  const [postToDelete, setPostToDelete] = useState<RecentPost | null>(null)

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (slug.length < 2) return toast('Room name is too short', 'error')
    setCreating(true)
    try {
      await createRoom({ slug, name: slug, description: description.trim() || null, category, is_locked: locked })
      setName('')
      setDescription('')
      setLocked(false)
      toast(`#${slug} created`)
      rooms.refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setCreating(false)
    }
  }

  const toggleLock = async (r: CommunityRoom) => {
    try {
      await updateRoom(r.id, { is_locked: !r.is_locked })
      rooms.setData((list) => list?.map((x) => (x.id === r.id ? { ...x, is_locked: !r.is_locked } : x)) ?? null)
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const removeRoom = async () => {
    if (!roomToDelete) return
    const target = roomToDelete
    setRoomToDelete(null)
    try {
      await deleteRoom(target.id)
      rooms.setData((list) => list?.filter((x) => x.id !== target.id) ?? null)
      toast(`#${target.slug} deleted`)
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const removePost = async () => {
    if (!postToDelete) return
    const target = postToDelete
    setPostToDelete(null)
    try {
      await deleteRoomMessage(target.id)
      posts.setData((list) => list?.filter((x) => x.id !== target.id) ?? null)
      toast('Post removed')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Community</h1>
      <p className="mt-1 text-text-secondary">Create rooms, lock announcement channels and moderate posts.</p>

      <Card className="mt-6 p-5">
        <form onSubmit={create} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Room name" hint={slug ? `Will appear as #${slug}` : 'Lowercase, dashes for spaces'}>
              {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="flutter" />}
            </Field>
            <Field label="Group">
              {(id) => (
                <Select id={id} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="Description" optional>
            {(id) => <Input id={id} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this room for?" />}
          </Field>
          <Toggle checked={locked} onChange={setLocked} label="Admins only can post" description="Use this for announcements." />
          <Button type="submit" loading={creating} className="self-start">
            Create room
          </Button>
        </form>
      </Card>

      <section className="mt-8">
        <h2 className="mb-3 text-[17px] font-semibold text-text-primary">Rooms</h2>
        {rooms.loading ? (
          <ListSkeleton rows={4} />
        ) : rooms.error ? (
          <ErrorState message={rooms.error} onRetry={rooms.reload} />
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {(rooms.data ?? []).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                {r.is_locked ? <Lock size={17} className="text-text-muted" /> : <Hash size={17} className="text-text-muted" />}
                <Link to={`/community/${r.slug}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text-primary">{r.name}</p>
                  <p className="truncate text-xs text-text-secondary">
                    {r.category} · {r.message_count ?? 0} posts{r.last_message_at ? ` · last ${timeAgo(r.last_message_at)}` : ''}
                  </p>
                </Link>
                <button
                  onClick={() => toggleLock(r)}
                  aria-label={r.is_locked ? 'Unlock room' : 'Lock room'}
                  title={r.is_locked ? 'Admins only — click to open to everyone' : 'Open — click to make admins-only'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary"
                >
                  {r.is_locked ? <Unlock size={16} /> : <Lock size={16} />}
                </button>
                <button onClick={() => setRoomToDelete(r)} aria-label={`Delete #${r.slug}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[17px] font-semibold text-text-primary">Latest posts</h2>
        {posts.loading ? (
          <ListSkeleton rows={4} />
        ) : !posts.data?.length ? (
          <p className="text-sm text-text-secondary">No posts yet.</p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {posts.data.map((p) => (
              <div key={p.id} className="flex gap-3 px-4 py-3">
                <Avatar name={p.author?.name} src={p.author?.avatar_url} size="sm" seed={p.author?.id} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-secondary">
                    <span className="font-semibold text-text-primary">{p.author?.name ?? 'Someone'}</span> in #{p.room?.slug} · {timeAgo(p.created_at)}
                  </p>
                  <p className="mt-0.5 line-clamp-3 text-sm text-text-primary">{p.body}</p>
                </div>
                <button onClick={() => setPostToDelete(p)} aria-label="Delete post" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog open={!!roomToDelete} danger title={`Delete #${roomToDelete?.slug}?`} body="All posts in this room are deleted too." confirmLabel="Delete room" onConfirm={removeRoom} onClose={() => setRoomToDelete(null)} />
      <ConfirmDialog open={!!postToDelete} danger title="Remove this post?" confirmLabel="Remove" onConfirm={removePost} onClose={() => setPostToDelete(null)} />
    </div>
  )
}
