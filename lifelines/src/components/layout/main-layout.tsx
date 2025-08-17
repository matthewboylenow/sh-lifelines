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
      <main className={`flex-1 ${noPadding ? '' : 'py-8'}`}>
        {children}
      </main>
      <Footer />
    </div>
  )
}