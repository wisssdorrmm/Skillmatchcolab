import type { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { BRAND } from '../../config/brand'
import { Logo } from '../Logo'

const POINTS = [
  'Find teammates who match your stack and goals',
  'Post a roadmap and watch your progress bar fill up',
  'Contribute to real open-source projects',
  'Apply for grants, credits and funding',
]

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-bg">
      <div className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden border-r border-border bg-sidebar p-12 lg:flex">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <Logo />
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-text-primary">
            {BRAND.tagline.split('.')[0]}.
            <br />
            <span className="text-accent">{BRAND.tagline.split('.')[1]?.trim()}.</span>
          </h2>
          <p className="mt-4 max-w-md text-[17px] text-text-secondary">{BRAND.description}</p>
          <ul className="mt-8 flex flex-col gap-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] text-text-primary">
                <CheckCircle2 size={20} className="mt-px shrink-0 text-accent" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-text-muted">© {new Date().getFullYear()} {BRAND.name}</p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-text-primary">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-text-secondary">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
