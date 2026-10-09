import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, SendHorizonal, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { dayLabel, formatTime } from '../../lib/format'

/** Full-height chat screen: header, scrolling messages, composer pinned to the bottom. */
export function ChatScreen({
  header,
  children,
  composer,
  scrollRef,
}: {
  header: ReactNode
  children: ReactNode
  composer: ReactNode
  scrollRef?: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="-mx-4 flex h-dvh flex-col sm:-mx-6 lg:mx-0">
      <div className="shrink-0 border-b border-border bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">{header}</div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 lg:px-0">
        {children}
      </div>
      <div className="shrink-0 border-t border-border bg-bg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-0">{composer}</div>
    </div>
  )
}

export function ChatHeader({ title, subtitle, left, right, backTo }: { title: ReactNode; subtitle?: ReactNode; left?: ReactNode; right?: ReactNode; backTo?: string }) {
  const navigate = useNavigate()
  return (
    <div className="flex h-16 items-center gap-2 px-2 sm:px-4 lg:px-0">
      <button
        onClick={() => (backTo ? navigate(backTo) : window.history.length > 1 ? navigate(-1) : navigate('/'))}
        aria-label="Back"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-2 hover:text-text-primary lg:-ml-2"
      >
        <ChevronLeft size={22} />
      </button>
      {left}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-semibold text-text-primary">{title}</div>
        {subtitle && <div className="truncate text-[13px] text-text-secondary">{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}

export function DaySeparator({ iso }: { iso: string }) {
  return (
    <div className="my-4 flex items-center gap-3 text-xs font-medium text-text-muted">
      <span className="h-px flex-1 bg-border" />
      {dayLabel(iso)}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export function Bubble({ mine, text, time, pending }: { mine: boolean; text: string; time: string; pending?: boolean }) {
  return (
    <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-[70%]',
          mine ? 'rounded-br-md bg-accent text-accent-ink' : 'rounded-bl-md bg-surface-2 text-text-primary',
          pending && 'opacity-60',
        )}
      >
        {text}
      </div>
      <span className="mt-1 px-1 text-[11px] text-text-muted">{pending ? 'Sending…' : formatTime(time)}</span>
    </div>
  )
}

const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

interface ComposerProps {
  placeholder: string
  onSend: (text: string) => Promise<void> | void
  disabled?: boolean
  disabledText?: string
  replyTo?: { name: string; body: string } | null
  onCancelReply?: () => void
  maxLength?: number
}

export function Composer({ placeholder, onSend, disabled, disabledText, replyTo, onCancelReply, maxLength = 2000 }: ComposerProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  useEffect(() => {
    if (replyTo) ta.current?.focus()
  }, [replyTo])

  if (disabled) {
    return <p className="py-3 text-center text-sm text-text-secondary">{disabledText}</p>
  }

  const send = async () => {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    try {
      await onSend(t)
      setText('')
    } finally {
      setSending(false)
      ta.current?.focus()
    }
  }

  return (
    <div>
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-accent bg-surface-2 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-accent">Replying to {replyTo.name}</p>
            <p className="truncate text-xs text-text-secondary">{replyTo.body}</p>
          </div>
          <button onClick={onCancelReply} aria-label="Cancel reply" className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={ta}
          rows={1}
          value={text}
          maxLength={maxLength}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isTouch()) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] leading-6 text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          aria-label="Send"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink transition-colors hover:bg-accent-hover disabled:bg-surface-2 disabled:text-text-muted"
        >
          <SendHorizonal size={20} />
        </button>
      </div>
    </div>
  )
}
