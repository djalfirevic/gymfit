import { LanguageSwitcher } from '@/components/shell/LanguageSwitcher'
import { ThemeToggle } from '@/components/shell/ThemeToggle'

export function Topbar() {
  return (
    <header className="sticky top-0 z-10 flex h-[58px] shrink-0 items-center gap-3 border-b border-line bg-surface px-6">
      <div className="flex-1" />
      <LanguageSwitcher />
      <ThemeToggle />
      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-fg">
        DA
      </div>
    </header>
  )
}
