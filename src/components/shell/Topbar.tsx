import { LanguageSwitcher } from '@/components/shell/LanguageSwitcher'
import { MobileNav } from '@/components/shell/MobileNav'
import { ThemeToggle } from '@/components/shell/ThemeToggle'

export function Topbar() {
  return (
    <header className="sticky top-0 z-10 flex h-[58px] shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:px-6">
      <MobileNav />
      {/* The wordmark lives in the sidebar, which is hidden on phones. */}
      <span className="text-md font-bold tracking-tight text-heading md:hidden">GymFit</span>
      <div className="flex-1" />
      <LanguageSwitcher />
      <ThemeToggle />
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-fg">
        DA
      </div>
    </header>
  )
}
