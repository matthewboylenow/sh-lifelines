'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, LogIn, Smartphone, Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { UserRole } from '@prisma/client'
import { hasRole } from '@/lib/auth-utils'

type LoginMode = 'email' | 'sms'
type SmsStep = 'phone' | 'verify'

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('email')

  // Email/password state
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  // SMS state
  const [cellPhone, setCellPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [smsStep, setSmsStep] = useState<SmsStep>('phone')
  const [resendCountdown, setResendCountdown] = useState(0)

  // Shared state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectByRole = async () => {
    const session = await getSession()
    const userRoles = session?.user?.roles || (session?.user?.role ? [session.user.role] : [])

    if (hasRole(userRoles, UserRole.ADMIN)) {
      router.push('/dashboard/admin')
    } else if (hasRole(userRoles, UserRole.FORMATION_SUPPORT_TEAM)) {
      router.push('/dashboard/formation-support')
    } else if (hasRole(userRoles, UserRole.LIFELINE_LEADER)) {
      router.push('/dashboard/leader')
    } else {
      router.push('/profile')
    }
  }

  // Email/password submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else if (result?.ok) {
        await redirectByRole()
      }
    } catch {
      setError('An error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  // SMS - send code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const digits = cellPhone.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/sms/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellPhone: digits }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send code')
      } else {
        setSmsStep('verify')
        // Start 60s resend countdown
        setResendCountdown(60)
        const interval = setInterval(() => {
          setResendCountdown(prev => {
            if (prev <= 1) { clearInterval(interval); return 0 }
            return prev - 1
          })
        }, 1000)
      }
    } catch {
      setError('Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  // SMS - verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const digits = cellPhone.replace(/\D/g, '')

    try {
      const res = await fetch('/api/auth/sms/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellPhone: digits, code: smsCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid code')
        setLoading(false)
        return
      }

      // Code verified — sign in via NextAuth SMS provider
      const verifiedUser = data.data.user
      const result = await signIn('sms', {
        userId: verifiedUser.id,
        email: verifiedUser.email,
        name: verifiedUser.name,
        roles: JSON.stringify(verifiedUser.roles),
        redirect: false,
      })

      if (result?.error) {
        setError('Sign in failed. Please try again.')
      } else if (result?.ok) {
        await redirectByRole()
      }
    } catch {
      setError('An error occurred during verification')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode)
    setError(null)
    setSmsStep('phone')
    setSmsCode('')
  }

  return (
    <div className="space-y-6">
      {/* Mode Tabs */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => switchMode('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'email'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Mail className="h-4 w-4" />
          Email & Password
        </button>
        <button
          type="button"
          onClick={() => switchMode('sms')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'sms'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          Sign in via Mobile
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Email/Password Form */}
      {mode === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="pr-10"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <div className="loading-spinner mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>

          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:text-primary-dark underline"
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      )}

      {/* SMS Login Form */}
      {mode === 'sms' && smsStep === 'phone' && (
        <form onSubmit={handleSendCode} className="space-y-6">
          <div>
            <Label htmlFor="cellPhone">Cell Phone Number</Label>
            <Input
              id="cellPhone"
              type="tel"
              autoComplete="tel"
              required
              placeholder="(555) 123-4567"
              value={cellPhone}
              onChange={(e) => setCellPhone(formatPhone(e.target.value))}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Enter the cell phone number associated with your account
            </p>
          </div>

          <div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <div className="loading-spinner mr-2" />
              ) : (
                <Smartphone className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Sending code...' : 'Send Verification Code'}
            </Button>
          </div>
        </form>
      )}

      {mode === 'sms' && smsStep === 'verify' && (
        <form onSubmit={handleVerifyCode} className="space-y-6">
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm mb-4">
              A 6-digit code has been sent to {cellPhone}
            </div>
          </div>

          <div>
            <Label htmlFor="smsCode">Verification Code</Label>
            <Input
              id="smsCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              placeholder="Enter 6-digit code"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              value={smsCode}
              onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading || smsCode.length !== 6}
              className="w-full"
            >
              {loading ? (
                <div className="loading-spinner mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setSmsStep('phone'); setSmsCode(''); setError(null) }}
              className="text-primary hover:text-primary-dark flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Change number
            </button>
            <button
              type="button"
              disabled={resendCountdown > 0 || loading}
              onClick={(e) => {
                e.preventDefault()
                handleSendCode(e as unknown as React.FormEvent)
              }}
              className={`${
                resendCountdown > 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-primary hover:text-primary-dark underline'
              }`}
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
