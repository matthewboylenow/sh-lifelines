import type { Metadata } from 'next'
import { Libre_Franklin, Libre_Baskerville } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'

const libreFranklin = Libre_Franklin({ 
  subsets: ['latin'],
  variable: '--font-libre-franklin',
  display: 'swap'
})

const libreBaskerville = Libre_Baskerville({ 
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-libre-baskerville',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'LifeLines at Saint Helen',
  description: 'Saint Helen Church small groups management system',
  keywords: ['church', 'small groups', 'community', 'faith', 'saint helen'],
  authors: [{ name: 'Saint Helen Church' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${libreFranklin.variable} ${libreBaskerville.variable}`}>
      <body className="min-h-screen bg-background">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}