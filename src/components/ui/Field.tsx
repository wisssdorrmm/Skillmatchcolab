import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { cn } from '../../lib/cn'

export const inputClass =
  'w-full rounded-xl border border-border bg-surface-2 px-4 text-[15px] text-text-primary placeholder:text-text-muted transition-colors focus:border-accent focus:outline-none disabled:opacity-60'

interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string | null
  children: (id: string) => ReactNode
  className?: string
  optional?: boolean
  counter?: { value: number; max: number }
}

export function Field({ label, hint, error, children, className, optional, counter }: FieldProps) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-[13px] font-medium text-text-secondary">
            {label}
            {optional && <span className="ml-1 font-normal text-text-muted">(optional)</span>}
          </label>
          {counter && (
            <span className={cn('text-[11px] tabular-nums', counter.value > counter.max ? 'text-danger' : 'text-text-muted')}>
              {counter.value}/{counter.max}
            </span>
          )}
        </div>
      )}
      {children(id)}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-text-muted">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputClass, 'h-12', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 4, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(inputClass, 'resize-none py-3 leading-relaxed', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        inputClass,
        'h-12 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20fill%3D%27none%27%20stroke%3D%27%23a1a1aa%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27M4%206l4%204%204-4%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  )
})

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} className="pr-12" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-text-muted hover:text-text-secondary"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

interface TagInputProps {
  id?: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  suggestions?: string[]
  max?: number
}

/** Type and press Enter (or pick a suggestion) to add tags. */
export function TagInput({ id, value, onChange, placeholder, suggestions = [], max = 12 }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const add = (raw: string) => {
    const t = raw.trim().replace(/,$/, '').slice(0, 40)
    if (!t || value.some((v) => v.toLowerCase() === t.toLowerCase()) || value.length >= max) {
      setDraft('')
      return
    }
    onChange([...value, t])
    setDraft('')
  }
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
  const filtered = draft ? remaining.filter((s) => s.toLowerCase().includes(draft.toLowerCase())) : remaining
  return (
    <div className="flex flex-col gap-2">
      <div className={cn(inputClass, 'flex min-h-12 flex-wrap items-center gap-1.5 px-2 py-2 focus-within:border-accent')}>
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-accent/10 py-1 pl-2.5 pr-1 text-[13px] font-medium text-accent">
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => onChange(value.filter((v) => v !== t))}
              className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent/20"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length >= max ? `Max ${max}` : placeholder}
          disabled={value.length >= max}
          className="h-8 min-w-[8rem] flex-1 bg-transparent px-2 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none"
        />
      </div>
      {filtered.length > 0 && value.length < max && (
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {filtered.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="shrink-0 rounded-full border border-dashed border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className={cn('flex cursor-pointer items-center justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-text-primary">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-text-secondary">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-surface-hover')}
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full transition-all',
            checked ? 'left-6 bg-accent-ink' : 'left-1 bg-text-secondary',
          )}
        />
      </button>
    </label>
  )
}
