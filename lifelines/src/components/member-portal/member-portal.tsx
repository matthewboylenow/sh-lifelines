'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Mail,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  LogOut,
  ArrowLeft,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDayOfWeek, formatMeetingFrequency } from '@/utils/formatters'

interface Membership {
  id: string
  status: 'JOINED' | 'UNDECIDED'
  createdAt: string
  joinedAt: string | null
  lifeLine: {
    id: string
    slug: string | null
    title: string
    meetingTime: string | null
    dayOfWeek: string | null
    meetingFrequency: string | null
    location: string | null
    groupLeader: string | null
    leader: { displayName: string | null; email: string } | null
  }
}

export function MemberPortal() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  // Request-link state
  const [email, setEmail] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requestMessage, setRequestMessage] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)

  // Portal state
  const [loading, setLoading] = useState(!!token)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [leaveReasons, setLeaveReasons] = useState<string[]>([])
  const [tokenError, setTokenError] = useState<string | null>(null)

  // Leave flow
  const [leaving, setLeaving] = useState<Membership | null>(null)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)

  const loadMemberships = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setTokenError(null)
    try {
      const res = await fetch('/api/member-portal/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (!res.ok) {
        setTokenError(data.error || 'This link is invalid or has expired')
        return
      }

      setMemberships(data.data.memberships || [])
      setLeaveReasons(data.data.leaveReasons || [])
    } catch {
      setTokenError('We could not load your LifeLines. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadMemberships()
  }, [loadMemberships])

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequesting(true)
    setRequestError(null)
    setRequestMessage(null)

    try {
      const res = await fetch('/api/member-portal/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setRequestError(data.error || 'Something went wrong. Please try again.')
        return
      }

      setRequestMessage(data.message)
    } catch {
      setRequestError('Something went wrong. Please try again.')
    } finally {
      setRequesting(false)
    }
  }

  const handleLeave = async () => {
    if (!leaving || !reason) return
    setSubmitting(true)
    setLeaveError(null)

    try {
      const res = await fetch('/api/member-portal/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, inquiryId: leaving.id, reason, notes }),
      })
      const data = await res.json()

      if (!res.ok) {
        setLeaveError(data.error || 'We could not complete that. Please try again.')
        return
      }

      setConfirmation(data.message || `You have left ${leaving.lifeLine.title}`)
      setLeaving(null)
      setReason('')
      setNotes('')
      await loadMemberships()
    } catch {
      setLeaveError('We could not complete that. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- No token: ask for an email address ----
  if (!token) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        {requestMessage ? (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-secondary-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-600">{requestMessage}</p>
            <p className="text-sm text-gray-500 mt-4">
              The link expires in 60 minutes. If it doesn&rsquo;t arrive, check your spam folder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRequestLink} className="space-y-6">
            <p className="text-gray-600 text-sm">
              Enter the email address you used when you joined. We&rsquo;ll send you a secure link
              to view your LifeLines — no password needed.
            </p>

            {requestError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {requestError}
              </div>
            )}

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={requesting} className="w-full">
              {requesting ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Email me a link
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              For your privacy we&rsquo;ll always show the same message, whether or not the address
              is on file.
            </p>
          </form>
        )}
      </div>
    )
  }

  // ---- Token present ----
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">Loading your LifeLines...</span>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">This link has expired</h2>
        <p className="text-gray-600 mb-6">
          Links are valid for 60 minutes. Request a new one and we&rsquo;ll email it right over.
        </p>
        <Link href="/my-lifelines">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Request a new link
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {confirmation && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {confirmation}
        </div>
      )}

      {memberships.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            You&rsquo;re not in any LifeLines right now
          </h2>
          <p className="text-gray-600 mb-6">
            If you&rsquo;d like to join one, we&rsquo;d love to have you.
          </p>
          <Link href="/">
            <Button>Browse LifeLines</Button>
          </Link>
        </div>
      ) : (
        memberships.map((m) => (
          <div key={m.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-gray-900">{m.lifeLine.title}</h2>
                  {m.status === 'UNDECIDED' && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Request pending
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 space-y-1 mt-3">
                  {(m.lifeLine.dayOfWeek || m.lifeLine.meetingFrequency) && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {[
                        m.lifeLine.meetingFrequency
                          ? formatMeetingFrequency(m.lifeLine.meetingFrequency as never)
                          : null,
                        m.lifeLine.dayOfWeek
                          ? formatDayOfWeek(m.lifeLine.dayOfWeek as never)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                  {m.lifeLine.meetingTime && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {m.lifeLine.meetingTime}
                    </div>
                  )}
                  {m.lifeLine.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {m.lifeLine.location}
                    </div>
                  )}
                  {(m.lifeLine.leader?.displayName || m.lifeLine.groupLeader) && (
                    <div className="text-gray-500">
                      Led by {m.lifeLine.leader?.displayName || m.lifeLine.groupLeader}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setLeaving(m)
                  setReason('')
                  setNotes('')
                  setLeaveError(null)
                  setConfirmation(null)
                }}
                className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1 flex-shrink-0"
              >
                <LogOut className="h-4 w-4" />
                {m.status === 'JOINED' ? 'Leave' : 'Cancel request'}
              </button>
            </div>
          </div>
        ))
      )}

      {/* Leave dialog */}
      {leaving && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setLeaving(null)} />

            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {leaving.status === 'JOINED' ? 'Leave this LifeLine?' : 'Cancel your request?'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{leaving.lifeLine.title}</p>

              {leaveError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {leaveError}
                </div>
              )}

              <div className="mb-4">
                <Label htmlFor="reason">
                  Would you mind sharing why? <span className="text-red-500">*</span>
                </Label>
                <select
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-input form-select w-full mt-1"
                >
                  <option value="">Select a reason...</option>
                  {leaveReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <Label htmlFor="notes">Anything else? (optional)</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional — anything you'd like us to know"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none mt-1"
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <Lock className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">
                  What you share here stays internal — it goes only to your LifeLine leader and
                  parish staff. It is never posted publicly or shared with the group.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setLeaving(null)} disabled={submitting}>
                  Never mind
                </Button>
                <Button
                  onClick={handleLeave}
                  disabled={!reason || submitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                      Please wait...
                    </>
                  ) : leaving.status === 'JOINED' ? (
                    'Leave LifeLine'
                  ) : (
                    'Cancel request'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
