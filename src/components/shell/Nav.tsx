'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const LINKS = [
  { href: '/dashboard', label: 'Pregled' },
  { href: '/members', label: 'Članovi' },
  { href: '/payments', label: 'Uplate' },
  { href: '/store', label: 'Prodavnica' },
  { href: '/expenses', label: 'Troškovi' },
  { href: '/investments', label: 'Investicije' },
  { href: '/settings', label: 'Podešavanja' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-6 text-lg font-bold tracking-tight text-white">GYMFIT</div>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={clsx(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith(link.href) ? 'bg-white text-black' : 'text-neutral-300 hover:bg-neutral-800',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
