import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BRAND } from '../../config/brand'
import { Logo } from '../Logo'

/** Centered card for the login, signup and password screens. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-5 py-10 sm:px-8 sm:py-16">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative w-full max-w-[440px]">
        <div className="flex justify-center">
          <Logo />
        </div>

        <main className="mt-8 rounded-3xl border border-border bg-surface px-6 py-8 sm:px-10 sm:py-10">
          <h1 className="text-center text-[26px] font-bold leading-tight tracking-tight text-text-primary sm:text-[28px]">{title}</h1>
          {subtitle && <p className="mt-2 break-words text-center text-[15px] text-text-secondary">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </main>

        <p className="mt-6 flex items-center justify-center gap-2 text-[13px] text-text-muted">
          <span>
            © {new Date().getFullYear()} {BRAND.name}
          </span>
          <span aria-hidden="true">·</span>
          <Link to="/terms" className="hover:text-text-secondary hover:underline">
            Terms
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacy" className="hover:text-text-secondary hover:underline">
            Privacy
          </Link>
        </p>
      </div>
    </div>
  )
}
