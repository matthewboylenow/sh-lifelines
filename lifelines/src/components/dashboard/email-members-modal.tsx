'use client'

import { useState, useEffect } from 'react'
import { X, Send, Users, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface EmailMembersModalProps {
  isOpen: boolean
  onClose: () => void
  lifeLineId: string
  lifeLineTitle: string
}

interface Recipient {
  name: string
  email: string
  status: string
}

export function EmailMembersModal({
  isOpen,
  onClose,
  lifeLineId,
  lifeLineTitle
}: EmailMembersModalProps) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [recipientFilter, setRecipientFilter] = useState<'joined' | 'pending' | 'all'>('joined')
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch recipients when filter changes
  useEffect(() => {
    if (isOpen) {
      fetchRecipients()
    }
  }, [isOpen, recipientFilter, lifeLineId])

  const fetchRecipients = async () => {
    setLoadingRecipients(true)
    try {
      const response = await fetch(`/api/lifelines/${lifeLineId}/email?filter=${recipientFilter}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recipients')
      }

      setRecipients(data.data.recipients || [])
    } catch (err) {
      console.error('Error fetching recipients:', err)
      setRecipients([])
    } finally {
      setLoadingRecipients(false)
    }
  }

  const handleSend = async () => {
    if (!subject.trim()) {
      setError('Please enter a subject')
      return
    }
    if (!message.trim()) {
      setError('Please enter a message')
      return
    }
    if (recipients.length === 0) {
      setError('No recipients to send to')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/lifelines/${lifeLineId}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          message,
          recipientFilter
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      setSuccess(`Email sent successfully to ${data.data.recipientCount} member(s)!`)
      setTimeout(() => {
        onClose()
        setSubject('')
        setMessage('')
        setSuccess(null)
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSubject('')
    setMessage('')
    setError(null)
    setSuccess(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-primary-500 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6" />
                <div>
                  <h2 className="text-lg font-semibold">Email Members</h2>
                  <p className="text-sm text-white/80">{lifeLineTitle}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Success Message */}
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-700">{success}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Recipient Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send to
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientFilter('joined')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    recipientFilter === 'joined'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Joined Members
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientFilter('pending')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    recipientFilter === 'pending'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pending Inquiries
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    recipientFilter === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
              </div>

              {/* Recipients Preview */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  {loadingRecipients ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner className="w-4 h-4" />
                      Loading recipients...
                    </span>
                  ) : (
                    <span>
                      <strong>{recipients.length}</strong> recipient{recipients.length !== 1 ? 's' : ''} with email addresses
                    </span>
                  )}
                </div>
                {recipients.length > 0 && !loadingRecipients && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {recipients.slice(0, 5).map((r, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600"
                      >
                        {r.name}
                      </span>
                    ))}
                    {recipients.length > 5 && (
                      <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500">
                        +{recipients.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                disabled={loading}
              />
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message to members..."
                rows={8}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Your email and name will be included so members can reply directly to you.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading || recipients.length === 0}
            >
              {loading ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email ({recipients.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
