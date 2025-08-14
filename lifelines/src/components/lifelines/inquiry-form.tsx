'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface InquiryFormProps {
  lifeLineId: string
  lifeLineTitle: string
  isFullStatus?: boolean
}

export function InquiryForm({ lifeLineId, lifeLineTitle, isFullStatus = false }: InquiryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lifeLineId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          message: formData.message || null,
          source: 'PUBLIC_WEBSITE'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit inquiry')
      }

      setIsSubmitted(true)
    } catch (err) {
      setError('Failed to submit your inquiry. Please try again.')
      console.error('Inquiry submission error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (isSubmitted) {
    return (
      <div className="text-center py-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
          <div className="text-green-800">
            <h4 className="font-semibold mb-2">Interest Submitted Successfully!</h4>
            <p className="text-sm">
              Thank you for your interest in <strong>{lifeLineTitle}</strong>. 
              The LifeLine leader will contact you within 1-2 business days.
            </p>
          </div>
        </div>
        <Button 
          onClick={() => {
            setIsSubmitted(false)
            setFormData({ name: '', email: '', phone: '', message: '' })
          }}
          variant="outline"
          size="sm"
        >
          Submit Another Inquiry
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          placeholder="Your name"
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          placeholder="your.email@example.com"
        />
      </div>
      
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          placeholder="(555) 123-4567"
        />
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          Message (Optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          value={formData.message}
          onChange={handleChange}
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          placeholder={isFullStatus 
            ? "Let us know you'd like to join the waiting list..."
            : "Tell us why you're interested or any questions you have..."
          }
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full"
        size="lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Express Interest'}
      </Button>
      
      <p className="text-xs text-gray-500 text-center">
        Your information will be shared with the LifeLine leader who will contact you directly.
      </p>
    </form>
  )
}