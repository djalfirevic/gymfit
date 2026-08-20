'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { QuickAdd } from '@/components/shell/QuickAdd'

const LINKS = [
  { href: '/dashboard', label: 'Pregled' },
  { href: '/statistics', label: 'Statistika' },
  { href: '/members', label: 'Članovi' },
  { href: '/payments', label: 'Uplate' },
  { href: '/store', label: 'Prodavnica' },
  { href: '/expenses', label: 'Troškovi' },
  { href: '/investments', label: 'Investicije' },
  { href: '/locations', label: 'Lokacije' },
  { href: '/settings', label: 'Podešavanja' },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="flex h-full flex-col">
      <div className="flex h-[58px] shrink-0 items-center gap-2.5 border-b border-line px-5">
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-card bg-primary text-xs font-bold text-primary-fg">
          GF
        </div>
        <span className="text-lg font-bold tracking-tight text-heading">GymFit</span>
      </div>

      <div className="px-4 pt-4">
        <QuickAdd />
      </div>

      <div className="px-5 pt-4 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Meni</div>

      <div className="flex flex-col gap-px px-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              'rounded-card px-2.5 py-2 text-base font-medium transition-colors',
              pathname.startsWith(link.href)
                ? 'bg-primary-soft font-semibold text-primary'
                : 'text-muted hover:bg-primary-soft hover:text-primary',
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-auto mx-3 mb-4 rounded-card px-2.5 py-2 text-left text-base font-medium text-muted transition-colors hover:bg-primary-soft hover:text-primary"
      >
        Odjavi se
      </button>
    </nav>
  )
}
