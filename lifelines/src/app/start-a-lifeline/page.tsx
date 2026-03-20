'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { CheckCircle } from 'lucide-react'

const AGES_STAGES_OPTIONS = [
  'All Ages & Stages',
  'Women',
  'Men',
  'Seniors',
  'Dads',
  'Grandparents',
  'Moms',
]

const GROUP_TYPE_OPTIONS = [
  { value: 'SOCIAL', label: 'Social' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'SCRIPTURE_BASED', label: 'Scripture Based' },
  { value: 'SUNDAY_BASED', label: 'Sunday Based' },
]

const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'SEASONALLY', label: 'Seasonally' },
  { value: 'LENT_2026', label: 'Lent 2026' },
  { value: 'ADVENT_2026', label: 'Advent 2026' },
]

const DAY_OPTIONS = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
  { value: 'VARIES', label: 'Varies' },
]

export default function StartALifeLinePage() {
  const [formData, setFormData] = useState({
    groupLeader: '',
    leaderEmail: '',
    cellPhone: '',
    title: '',
    description: '',
    agesStages: '' as string,
    groupType: '',
    meetingFrequency: '',
    dayOfWeek: '',
    meetingTime: '',
    additionalInfo: '',
  })
  const [selectedAgesStages, setSelectedAgesStages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const toggleAgeStage = (option: string) => {
    setSelectedAgesStages(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Build description with additional info appended
      let fullDescription = formData.description || ''
      if (formData.additionalInfo) {
        fullDescription = fullDescription
          ? `${fullDescription}\n\nAdditional Information: ${formData.additionalInfo}`
          : formData.additionalInfo
      }

      const payload: Record<string, any> = {
        title: formData.title,
        groupLeader: formData.groupLeader,
        leaderEmail: formData.leaderEmail,
      }

      if (formData.cellPhone) payload.cellPhone = formData.cellPhone
      if (fullDescription) payload.description = fullDescription
      if (selectedAgesStages.length > 0) payload.agesStages = selectedAgesStages.join(', ')
      if (formData.groupType) payload.groupType = formData.groupType
      if (formData.meetingFrequency) payload.meetingFrequency = formData.meetingFrequency
      if (formData.dayOfWeek) payload.dayOfWeek = formData.dayOfWeek
      if (formData.meetingTime) payload.meetingTime = formData.meetingTime

      const response = await fetch('/api/formation-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSubmitted(true)
      } else {
        setError(result.error || 'Failed to submit your request. Please try again.')
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto py-16 px-4 text-center">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 md:p-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Thank You!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Your formation request has been submitted. The Formation & Support Team will review it and get back to you.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Start a LifeLine
          </h1>
          <p className="text-lg text-gray-600">
            Fill out the form below to request a new LifeLine. Our Formation & Support Team will review your submission and follow up with you.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Your Information</h2>

              <div>
                <Label htmlFor="groupLeader">Your Name *</Label>
                <Input
                  id="groupLeader"
                  type="text"
                  required
                  placeholder="Full name"
                  value={formData.groupLeader}
                  onChange={(e) => setFormData(prev => ({ ...prev, groupLeader: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="leaderEmail">Your Email *</Label>
                <Input
                  id="leaderEmail"
                  type="email"
                  required
                  placeholder="email@example.com"
                  value={formData.leaderEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, leaderEmail: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="cellPhone">Cell Phone</Label>
                <Input
                  id="cellPhone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={formData.cellPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, cellPhone: e.target.value }))}
                />
              </div>
            </div>

            {/* LifeLine Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">LifeLine Details</h2>

              <div>
                <Label htmlFor="title">LifeLine Title *</Label>
                <Input
                  id="title"
                  type="text"
                  required
                  placeholder="What would you call your LifeLine?"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="What is your LifeLine about?"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <Label>Ages & Stages</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AGES_STAGES_OPTIONS.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleAgeStage(option)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        selectedAgesStages.includes(option)
                          ? 'bg-primary-100 border-primary-300 text-primary-800'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="groupType">Group Type</Label>
                  <select
                    id="groupType"
                    value={formData.groupType}
                    onChange={(e) => setFormData(prev => ({ ...prev, groupType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select type...</option>
                    {GROUP_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="meetingFrequency">Meeting Frequency</Label>
                  <select
                    id="meetingFrequency"
                    value={formData.meetingFrequency}
                    onChange={(e) => setFormData(prev => ({ ...prev, meetingFrequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select frequency...</option>
                    {FREQUENCY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dayOfWeek">Day of Week</Label>
                  <select
                    id="dayOfWeek"
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select day...</option>
                    {DAY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="meetingTime">Meeting Time</Label>
                  <Input
                    id="meetingTime"
                    type="text"
                    placeholder="e.g. 7:00 PM"
                    value={formData.meetingTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, meetingTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div>
              <Label htmlFor="additionalInfo">Additional Information</Label>
              <textarea
                id="additionalInfo"
                rows={3}
                placeholder="Anything else you'd like us to know?"
                value={formData.additionalInfo}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Submitting...' : 'Submit Formation Request'}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-primary-600 hover:text-primary-700">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </MainLayout>
  )
}
