import { Header } from './header'
import { Footer } from './footer'

interface MainLayoutProps {
  children: React.ReactNode
  noPadding?: boolean
}

export function MainLayout({ children, noPadding = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* noPadding is for pages that open with a full-bleed hero, which has to
          meet the header directly. Those pages space their own content instead. */}
      <main className={`flex-1 ${noPadding ? '' : 'py-10 md:py-14'}`}>
        {children}
      </main>
      <Footer />
    </div>
  )
}