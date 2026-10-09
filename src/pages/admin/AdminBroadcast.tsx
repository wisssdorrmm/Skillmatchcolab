import { useState, type FormEvent } from 'react'
import { Megaphone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/errors'
import { sendBroadcast } from '../../services/admin.service'
import { postRoomMessage } from '../../services/community.service'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input, Textarea, Toggle } from '../../components/ui/Field'
import { ConfirmDialog } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'

export default function AdminBroadcast() {
  const { user } = useAuth()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [alsoPost, setAlsoPost] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [sending, setSending] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return toast('Add a title', 'error')
    setConfirm(true)
  }

  const send = async () => {
    setSending(true)
    try {
      const n = await sendBroadcast(title.trim(), body.trim())
      if (alsoPost) {
        const { data: room } = await supabase.from('community_rooms').select('id').eq('slug', 'announcements').maybeSingle()
        if (room) await postRoomMessage(room.id as string, user!.id, body.trim() ? `${title.trim()}\n\n${body.trim()}` : title.trim())
      }
      toast(`Sent to ${n} members`)
      setTitle('')
      setBody('')
      setConfirm(false)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Broadcast</h1>
      <p className="mt-1 text-text-secondary">Send a notification to every member — launches, events, funding calls.</p>
      <Card className="mt-6 p-5 sm:p-6">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Title" counter={{ value: title.length, max: 120 }}>
            {(id) => <Input id={id} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Hacktoberfest is live 🎉" />}
          </Field>
          <Field label="Message" optional counter={{ value: body.length, max: 500 }}>
            {(id) => <Textarea id={id} rows={4} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Pick an open-source project from Explore and ship your first PR this week." />}
          </Field>
          <Toggle checked={alsoPost} onChange={setAlsoPost} label="Also post in #announcements" />
          <Button type="submit" icon={<Megaphone size={16} />} className="self-start">
            Send to everyone
          </Button>
        </form>
      </Card>
      <ConfirmDialog
        open={confirm}
        title="Send to every member?"
        body="Everyone gets this in their notifications. You can't unsend it."
        confirmLabel="Send"
        loading={sending}
        onConfirm={send}
        onClose={() => setConfirm(false)}
      />
    </div>
  )
}
