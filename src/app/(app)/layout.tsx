import { Nav } from '@/components/shell/Nav'
import { Topbar } from '@/components/shell/Topbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ground">
      <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 border-r border-line bg-surface md:block">
        <Nav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
