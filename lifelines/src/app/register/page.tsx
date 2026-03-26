'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { UserRole } from '@prisma/client'
import { hasRole } from '@/lib/auth-utils'

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.MEMBER]: 'Member',
  [UserRole.LIFELINE_LEADER]: 'LifeLine Leader',
  [UserRole.FORMATION_SUPPORT_TEAM]: 'Formation Support',
  [UserRole.ADMIN]: 'Admin',
}

export default function RegisterPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    cellPhone: '',
  })
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([UserRole.MEMBER])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Only admins can access this page
  if (session && !hasRole(session.user.roles || session.user.role, UserRole.ADMIN)) {
    router.push('/dashboard')
    return null
  }

  const toggleRole = (role: UserRole) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    // Validate form
    const newErrors: Record<string, string> = {}
    if (!formData.email) newErrors.email = 'Email is required'
    if (!formData.password) newErrors.password = 'Password is required'
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    if (!formData.password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if (!formData.displayName) newErrors.displayName = 'Display name is required'
    if (selectedRoles.length === 0) newErrors.roles = 'At least one role is required'

    // cellPhone required for non-member roles
    const requiresPhone = selectedRoles.some(r =>
      ([UserRole.LIFELINE_LEADER, UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN] as UserRole[]).includes(r)
    )
    if (requiresPhone && !formData.cellPhone.replace(/\D/g, '')) {
      newErrors.cellPhone = 'Cell phone is required for this role'
    } else if (formData.cellPhone && formData.cellPhone.replace(/\D/g, '').length < 10) {
      newErrors.cellPhone = 'Please enter a valid 10-digit phone number'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          cellPhone: formData.cellPhone.replace(/\D/g, '') || null,
          roles: selectedRoles,
        }),
      })

      const result = await response.json()

      if (result.success) {
        router.push('/dashboard/admin?message=User registered successfully')
      } else {
        setErrors({ general: result.error || 'Registration failed' })
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-8">You must be logged in as an admin to register users.</p>
          <Link href="/login">
            <Button>Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Register New User
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Admin only - Create new user accounts
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/70 backdrop-blur-sm py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {errors.general}
              </div>
            )}

            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                autoComplete="name"
                required
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
              )}
            </div>

            <div>
              <Label>User Roles</Label>
              <div className="mt-2 space-y-2">
                {Object.values(UserRole).map(role => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{ROLE_LABELS[role]}</span>
                  </label>
                ))}
              </div>
              {errors.roles && (
                <p className="mt-1 text-sm text-red-600">{errors.roles}</p>
              )}
            </div>

            <div>
              <Label htmlFor="cellPhone">
                Cell Phone
                {selectedRoles.some(r => ([UserRole.LIFELINE_LEADER, UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN] as UserRole[]).includes(r)) && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              <Input
                id="cellPhone"
                type="tel"
                autoComplete="tel"
                placeholder="(555) 123-4567"
                value={formData.cellPhone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                  let formatted = digits
                  if (digits.length > 6) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
                  else if (digits.length > 3) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`
                  setFormData({ ...formData, cellPhone: formatted })
                }}
              />
              {selectedRoles.some(r => ([UserRole.LIFELINE_LEADER, UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN] as UserRole[]).includes(r)) && (
                <p className="mt-1 text-xs text-gray-500">
                  Required for Leaders, Formation Support, and Admins. Enables sign-in via mobile.
                </p>
              )}
              {errors.cellPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.cellPhone}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-sm text-gray-600">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create User Account'}
              </Button>
            </div>

            <div className="text-center">
              <Link href="/dashboard/admin" className="text-sm text-primary hover:text-primary-dark">
                &larr; Back to Admin Dashboard
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
