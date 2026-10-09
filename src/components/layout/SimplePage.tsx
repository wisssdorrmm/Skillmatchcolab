import type { ReactNode } from 'react'
import { Logo } from '../Logo'
import { PageHeader } from '../ui/PageHeader'

/** Standalone page (no app shell) for legal text and account actions. */
export function SimplePage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <div className="mb-8">
          <Logo />
        </div>
        <PageHeader back title={title} />
        {children}
      </div>
    </div>
  )
}
