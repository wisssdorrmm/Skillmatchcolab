import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, FileText, KeyRound, LogOut, Mail, ShieldCheck, Smartphone, UserCog, UserX } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/errors'
import { updateProfile } from '../services/profiles.service'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Field, PasswordInput, Toggle } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2.5 px-1 text-[15px] font-semibold text-text-primary">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">{children}</div>
    </section>
  )
}

function Row({ icon, title, subtitle, right, to }: { icon: ReactNode; title: string; subtitle?: string; right?: ReactNode; to?: string }) {
  const body = (
    <>
      <span className="text-text-secondary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-text-primary">{title}</span>
        {subtitle && <span className="block truncate text-[13px] text-text-secondary">{subtitle}</span>}
      </span>
      {right ?? (to && <ChevronRight size={18} className="text-text-muted" />)}
    </>
  )
  const cls = 'flex min-h-16 items-center gap-3.5 px-4 py-3'
  return to ? (
    <Link to={to} className={`${cls} hover:bg-surface-2/50`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export default function Settings() {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth()
  const toast = useToast()
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaving, setPwSaving] = useState(false)
  const [showOnline, setShowOnline] = useState(profile?.show_online ?? true)

  const savePassword = async () => {
    setPwError(null)
    if (pw.length < 8) return setPwError('Use at least 8 characters.')
    if (pw !== pw2) return setPwError("Those passwords don't match.")
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwSaving(false)
    if (error) return setPwError(errorMessage(error))
    setPwOpen(false)
    setPw('')
    setPw2('')
    toast('Password updated')
  }

  const toggleOnline = async (next: boolean) => {
    setShowOnline(next)
    try {
      await updateProfile(user!.id, { show_online: next })
      await refreshProfile()
    } catch (err) {
      setShowOnline(!next)
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <div>
      <PageHeader back="/profile" title="Settings" />

      {isAdmin && (
        <Group title="Admin">
          <Row icon={<ShieldCheck size={20} />} title="Admin panel" subtitle="Members, active users, projects, funding and more" to="/admin" />
        </Group>
      )}

      <Group title="Account">
        <Row icon={<UserCog size={20} />} title="Edit profile" subtitle="Photo, name, role, skills and links" to="/settings/profile" />
        <Row icon={<Mail size={20} />} title="Email" subtitle={user?.email ?? ''} />
        <Row
          icon={<KeyRound size={20} />}
          title="Password"
          subtitle="Change your password"
          right={
            <Button variant="secondary" size="sm" onClick={() => setPwOpen(true)}>
              Change
            </Button>
          }
        />
      </Group>

      <Group title="Privacy">
        <div className="px-4 py-4">
          <Toggle
            checked={showOnline}
            onChange={toggleOnline}
            label="Show when I'm online"
            description="Others see a green dot on your photo and when you were last active. Turn it off and they see neither."
          />
        </div>
      </Group>

      <Group title="App">
        <Row icon={<Smartphone size={20} />} title="Install the app" subtitle="In your browser menu, choose Install app or Add to Home Screen." />
        <Row icon={<FileText size={20} />} title="Terms of Service" to="/terms" />
        <Row icon={<FileText size={20} />} title="Privacy Policy" to="/privacy" />
      </Group>

      <Group title="Session">
        <button onClick={() => signOut()} className="flex min-h-16 w-full items-center gap-3.5 px-4 text-left text-[15px] font-medium text-danger hover:bg-surface-2/50">
          <LogOut size={20} /> Log out
        </button>
        <Row icon={<UserX size={20} />} title="Deactivate account" subtitle="Step away for now, or ask us to delete your data." to="/deactivate-account" />
      </Group>

      <Modal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change password"
        size="sm"
        footer={
          <Button fullWidth loading={pwSaving} onClick={savePassword}>
            Save password
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="New password" hint="At least 8 characters.">
            {(id) => <PasswordInput id={id} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />}
          </Field>
          <Field label="Confirm new password">
            {(id) => <PasswordInput id={id} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />}
          </Field>
          {pwError && <p className="text-sm text-danger">{pwError}</p>}
        </div>
      </Modal>
    </div>
  )
}
