'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { Menu, X, LogOut, User, Settings } from 'lucide-react'
import { UserRole } from '@prisma/client'

export function Header() {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Home', href: '/', current: false },
  ]

  const dashboardNavigation: { name: string; href: string; roles: UserRole[] }[] = [
    { 
      name: 'Leader Dashboard', 
      href: '/dashboard/leader', 
      roles: [UserRole.LIFELINE_LEADER, UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN] 
    },
    { 
      name: 'Formation & Support', 
      href: '/dashboard/formation-support', 
      roles: [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN] 
    },
    { 
      name: 'Admin', 
      href: '/dashboard/admin', 
      roles: [UserRole.ADMIN] 
    },
  ]

  const userNavigation = [
    { name: 'Your Profile', href: '/profile' },
    { name: 'Settings', href: '/settings' },
  ]

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <header className="bg-blue-900 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo/LifeLines-White-Logo-Header.png"
                alt="LifeLines at Saint Helen"
                width={200}
                height={40}
                className="h-10"
                style={{ width: 'auto', height: 'auto' }}
                priority
              />
            </Link>
          </div>

          {/* Desktop Navigation - All aligned to the right */}
          <div className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="site-nav-link"
              >
                {item.name}
              </Link>
            ))}

            {/* Dashboard Links */}
            {session && (
              <>
                {dashboardNavigation
                  .filter(item => item.roles.includes(session.user.role as UserRole))
                  .map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="site-nav-link"
                    >
                      {item.name}
                    </Link>
                  ))}
              </>
            )}

            {session ? (
              <div className="relative group">
                <button
                  className="flex items-center space-x-2 text-white hover:text-secondary-500 transition-colors"
                  aria-label="User menu"
                  aria-haspopup="true"
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                  <span className="hidden sm:block font-medium">
                    {session.user.name || session.user.email}
                  </span>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    {userNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {item.name === 'Your Profile' && <User className="h-4 w-4 mr-2" aria-hidden="true" />}
                        {item.name === 'Settings' && <Settings className="h-4 w-4 mr-2" aria-hidden="true" />}
                        {item.name}
                      </Link>
                    ))}
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="site-nav-link"
              >
                Log In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-white hover:text-secondary-500 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-blue-700 rounded-b-lg">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 text-white hover:text-secondary-500 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {session ? (
                <>
                  <div className="border-t border-blue-400 my-2"></div>
                  {dashboardNavigation
                    .filter(item => item.roles.includes(session.user.role as UserRole))
                    .map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="block px-3 py-2 text-white hover:text-secondary-500 transition-colors font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}

                  <div className="border-t border-blue-400 my-2"></div>
                  {userNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="block px-3 py-2 text-white hover:text-secondary-500 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-2 text-white hover:text-secondary-500 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <div className="border-t border-blue-400 my-2"></div>
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-white hover:text-secondary-500 transition-colors font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log In
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}