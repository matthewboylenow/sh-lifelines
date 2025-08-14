'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Headphones, 
  ArrowLeft,
  Send,
  AlertTriangle,
  Info
} from 'lucide-react'
import { TicketPriority } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function CreateSupportTicketPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: TicketPriority.MEDIUM,
    ticketType: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const ticketTypes = [
    'General Question',
    'Technical Issue',
    'Account Problem',
    'LifeLine Management',
    'Formation Request',
    'Bug Report',
    'Feature Request',
    'Other'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setError('')
    setSuccess('')
    setLoading(true)

    // Validate form
    const newErrors: Record<string, string> = {}
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: formData.subject,
          description: formData.description,
          priority: formData.priority,
          ticketType: formData.ticketType || undefined
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Support ticket created successfully!')
        // Redirect to the ticket details page
        router.push(`/dashboard/formation-support/support-tickets/${result.data.id}`)
      } else {
        setError(result.error || 'Failed to create support ticket')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/formation-support/support-tickets" className="flex items-center text-primary hover:text-primary-dark">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Support Tickets
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Headphones className="h-8 w-8 mr-3" />
            Create Support Ticket
          </h1>
          <p className="text-gray-600">Get help from our support team</p>
        </div>

        {/* Form */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject */}
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                error={errors.subject}
                placeholder="Brief description of your issue"
                maxLength={200}
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.subject.length}/200 characters
              </p>
            </div>

            {/* Type and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="ticketType">Type</Label>
                <select
                  id="ticketType"
                  value={formData.ticketType}
                  onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="">Select a type (optional)</option>
                  {ticketTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="priority">Priority *</Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value={TicketPriority.LOW}>Low - General question</option>
                  <option value={TicketPriority.MEDIUM}>Medium - Standard issue</option>
                  <option value={TicketPriority.HIGH}>High - Important issue</option>
                  <option value={TicketPriority.URGENT}>Urgent - Critical problem</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <RichTextEditor
                value={formData.description}
                onChange={(description) => setFormData({ ...formData, description })}
                placeholder="Please provide as much detail as possible about your issue or question..."
                minHeight={200}
                maxHeight={400}
                className="mt-2"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Help Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-2">Tips for getting help faster:</div>
                  <ul className="space-y-1 text-xs">
                    <li>• Include specific error messages if any</li>
                    <li>• Mention what you were trying to do when the issue occurred</li>
                    <li>• Include your browser/device information for technical issues</li>
                    <li>• Add screenshots if they would be helpful (attach after creating)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Priority Warning */}
            {formData.priority === TicketPriority.URGENT && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-orange-800">
                    <div className="font-medium mb-1">Urgent Priority Selected</div>
                    <p>Please only select "Urgent" for critical issues that prevent you from using the system. 
                    Non-critical issues marked as urgent may receive delayed responses.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4 pt-6">
              <Link href="/dashboard/formation-support/support-tickets">
                <Button variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center"
              >
                {loading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </form>

          {/* Contact Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Need Immediate Help?</h3>
            <p className="text-sm text-gray-600">
              For urgent issues outside business hours, you can also contact us at{' '}
              <a href="mailto:support@sainthelen.org" className="text-primary hover:underline">
                support@sainthelen.org
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}