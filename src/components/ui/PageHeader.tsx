import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '../../lib/cn'

interface PageHeaderProps {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  back?: boolean | string
  className?: string
}

export function PageHeader({ title, subtitle, actions, back, className }: PageHeaderProps) {
  const navigate = useNavigate()
  const goBack = () => {
    if (typeof back === 'string') navigate(back)
    else if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }
  const backButton = back ? (
    <button
      onClick={goBack}
      className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary"
    >
      <ChevronLeft size={18} /> Back
    </button>
  ) : null

  // Back-only header (title lives in the page body): back on the left, actions on the right.
  if (!title) {
    return (
      <header className={cn('mb-4 flex min-h-9 items-center justify-between gap-3', className)}>
        {backButton ?? <span />}
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
    )
  }

  return (
    <header className={cn('mb-6', className)}>
      {backButton && <div className="mb-3">{backButton}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[15px] text-text-secondary">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
