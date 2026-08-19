import { Nav } from '@/components/shell/Nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-neutral-800 bg-neutral-950">
        <Nav />
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
