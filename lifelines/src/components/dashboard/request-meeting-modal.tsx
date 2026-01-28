'use client'

import { useState } from 'react'
import { X, Calendar, Clock, MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface RequestMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  lifeLineId: string
  lifeLineTitle: string
  supportContact: {
    id: string
    displayName: string | null
    email: string
  }
  leaderId: string
}

const MEETING_TOPICS = [
  { value: 'general', label: 'General Check-in' },
  { value: 'growth', label: 'Group Growth & Recruitment' },
  { value: 'challenges', label: 'Challenges or Concerns' },
  { value: 'resources', label: 'Resource Needs' },
  { value: 'training', label: 'Training or Formation' },
  { value: 'transition', label: 'Leadership Transition' },
  { value: 'other', label: 'Other' },
]

const PREFERRED_TIMES = [
  { value: 'morning', label: 'Morning (8am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 5pm)' },
  { value: 'evening', label: 'Evening (5pm - 8pm)' },
  { value: 'flexible', label: 'Flexible / No Preference' },
]

const MEETING_FORMATS = [
  { value: 'phone', label: 'Phone Call' },
  { value: 'video', label: 'Video Call (Zoom/Teams)' },
  { value: 'in_person', label: 'In Person' },
  { value: 'flexible', label: 'Any Format' },
]

export function RequestMeetingModal({
  isOpen,
  onClose,
  lifeLineId,
  lifeLineTitle,
  supportContact,
  leaderId
}: RequestMeetingModalProps) {
  const [topic, setTopic] = useState('general')
  const [preferredTime, setPreferredTime] = useState('flexible')
  const [meetingFormat, setMeetingFormat] = useState('flexible')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Build the meeting request description
      const topicLabel = MEETING_TOPICS.find(t => t.value === topic)?.label || topic
      const timeLabel = PREFERRED_TIMES.find(t => t.value === preferredTime)?.label || preferredTime
      const formatLabel = MEETING_FORMATS.find(f => f.value === meetingFormat)?.label || meetingFormat

      const description = `
**Meeting Request from LifeLine Leader**

**LifeLine:** ${lifeLineTitle}
**Topic:** ${topicLabel}
**Preferred Time:** ${timeLabel}
**Meeting Format:** ${formatLabel}
**Urgency:** ${urgency === 'urgent' ? '🚨 Urgent' : 'Normal'}

${additionalNotes ? `**Additional Notes:**\n${additionalNotes}` : ''}
      `.trim()

      const response = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Meeting Request: ${topicLabel} - ${lifeLineTitle}`,
          description,
          priority: urgency === 'urgent' ? 'HIGH' : 'MEDIUM',
          ticketType: 'MEETING_REQUEST',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit meeting request')
      }

      setSubmitted(true)

    } catch (err) {
      console.error('Error submitting meeting request:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset form state
    setTopic('general')
    setPreferredTime('flexible')
    setMeetingFormat('flexible')
    setAdditionalNotes('')
    setUrgency('normal')
    setSubmitted(false)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-secondary-100 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-secondary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Request a Meeting
                </h3>
                <p className="text-sm text-gray-600">
                  with {supportContact.displayName || 'Formation Support'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Request Sent!
            </h4>
            <p className="text-gray-600 mb-6">
              {supportContact.displayName || 'Your support contact'} will receive your meeting request and get back to you soon.
            </p>
            <Button onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-5">
              {/* LifeLine Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>LifeLine:</strong> {lifeLineTitle}
                </p>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What would you like to discuss?
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="form-input form-select w-full"
                  required
                >
                  {MEETING_TOPICS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Preferred Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Preferred Meeting Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PREFERRED_TIMES.map(time => (
                    <label
                      key={time.value}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                        preferredTime === time.value
                          ? 'border-secondary-500 bg-secondary-50 text-secondary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="preferredTime"
                        value={time.value}
                        checked={preferredTime === time.value}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-sm">{time.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Meeting Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Meeting Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MEETING_FORMATS.map(format => (
                    <label
                      key={format.value}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                        meetingFormat === format.value
                          ? 'border-secondary-500 bg-secondary-50 text-secondary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="meetingFormat"
                        value={format.value}
                        checked={meetingFormat === format.value}
                        onChange={(e) => setMeetingFormat(e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-sm">{format.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How urgent is this?
                </label>
                <div className="flex gap-3">
                  <label
                    className={`flex-1 flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                      urgency === 'normal'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value="normal"
                      checked={urgency === 'normal'}
                      onChange={() => setUrgency('normal')}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">Normal</span>
                  </label>
                  <label
                    className={`flex-1 flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                      urgency === 'urgent'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value="urgent"
                      checked={urgency === 'urgent'}
                      onChange={() => setUrgency('urgent')}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">Urgent</span>
                  </label>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="h-4 w-4 inline mr-1" />
                  Additional Notes (optional)
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                  className="form-input w-full"
                  placeholder="Any specific details or context you'd like to share..."
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
