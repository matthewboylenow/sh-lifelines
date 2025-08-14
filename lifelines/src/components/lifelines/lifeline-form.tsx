'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Save, 
  X, 
  Upload, 
  Image as ImageIcon, 
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Baby,
  AlertCircle,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { ImageSelector } from '@/components/ImageSelector'
import { LifeLine, User, LifeLineStatus, GroupType, MeetingFrequency, DayOfWeek } from '@prisma/client'

interface LifeLineFormProps {
  initialData?: Partial<LifeLine & { leader?: User }>
  mode: 'create' | 'edit'
  onSubmit?: (data: any) => void
  onCancel?: () => void
}

interface FormData {
  title: string
  subtitle: string
  description: string
  groupLeader: string
  leaderId: string
  dayOfWeek: DayOfWeek | ''
  meetingTime: string
  location: string
  meetingFrequency: MeetingFrequency | ''
  groupType: GroupType | ''
  agesStages: string[]
  maxParticipants: number | ''
  duration: string
  cost: string
  childcare: boolean
  imageUrl: string
  imageAlt: string
  imageAttribution: string
  status: LifeLineStatus
  isVisible: boolean
}

const INITIAL_FORM_DATA: FormData = {
  title: '',
  subtitle: '',
  description: '',
  groupLeader: '',
  leaderId: '',
  dayOfWeek: '',
  meetingTime: '',
  location: '',
  meetingFrequency: '',
  groupType: '',
  agesStages: [],
  maxParticipants: '',
  duration: '',
  cost: '',
  childcare: false,
  imageUrl: '',
  imageAlt: '',
  imageAttribution: '',
  status: 'DRAFT',
  isVisible: true
}

const AGES_STAGES_OPTIONS = [
  'Children (0-12)',
  'Teens (13-17)',
  'Young Adults (18-25)',
  'Adults (26-40)',
  'Middle Age (41-60)',
  'Seniors (60+)',
  'All Ages',
  'Families'
]

export function LifeLineForm({ initialData, mode, onSubmit, onCancel }: LifeLineFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [leaders, setLeaders] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showImageSelector, setShowImageSelector] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Load initial data
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        subtitle: initialData.subtitle || '',
        description: initialData.description || '',
        groupLeader: initialData.groupLeader || '',
        leaderId: initialData.leaderId || '',
        dayOfWeek: initialData.dayOfWeek || '',
        meetingTime: initialData.meetingTime || '',
        location: initialData.location || '',
        meetingFrequency: initialData.meetingFrequency || '',
        groupType: initialData.groupType || '',
        agesStages: initialData.agesStages || [],
        maxParticipants: initialData.maxParticipants || '',
        duration: initialData.duration || '',
        cost: initialData.cost || '',
        childcare: initialData.childcare || false,
        imageUrl: initialData.imageUrl || '',
        imageAlt: initialData.imageAlt || '',
        imageAttribution: initialData.imageAttribution || '',
        status: initialData.status || 'DRAFT',
        isVisible: initialData.isVisible ?? true
      })
    }
  }, [initialData])

  // Load leaders
  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const response = await fetch('/api/users?role=LEADER')
        if (response.ok) {
          const data = await response.json()
          setLeaders(data.data || [])
        }
      } catch (error) {
        console.error('Failed to load leaders:', error)
      }
    }
    fetchLeaders()
  }, [])

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleAgesStagesChange = (stage: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      agesStages: checked 
        ? [...prev.agesStages, stage]
        : prev.agesStages.filter(s => s !== stage)
    }))
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.title.trim()) {
      errors.title = 'Title is required'
    }
    if (!formData.groupLeader.trim()) {
      errors.groupLeader = 'Group leader is required'
    }
    if (formData.cost && isNaN(parseFloat(formData.cost))) {
      errors.cost = 'Cost must be a valid number'
    }
    if (formData.maxParticipants && isNaN(Number(formData.maxParticipants))) {
      errors.maxParticipants = 'Max participants must be a valid number'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent, saveAs: 'draft' | 'published' = 'draft') => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const submitData = {
        ...formData,
        status: saveAs === 'published' ? 'PUBLISHED' : 'DRAFT',
        isVisible: saveAs === 'published',
        maxParticipants: formData.maxParticipants ? Number(formData.maxParticipants) : null,
        cost: formData.cost || null,
        dayOfWeek: formData.dayOfWeek || null,
        meetingFrequency: formData.meetingFrequency || null,
        groupType: formData.groupType || null,
        leaderId: formData.leaderId || null
      }

      if (onSubmit) {
        await onSubmit(submitData)
      } else {
        const url = mode === 'create' 
          ? '/api/lifelines' 
          : `/api/lifelines/${initialData?.id}`
        
        const response = await fetch(url, {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to save LifeLine')
        }

        const result = await response.json()
        
        // Redirect to the LifeLine or back to admin
        if (mode === 'create' && result.data?.id) {
          router.push(`/lifelines/${result.data.id}`)
        } else {
          router.push('/dashboard/admin')
        }
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setError(error instanceof Error ? error.message : 'Failed to save LifeLine')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.back()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={(e) => handleSubmit(e, 'draft')} className="space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="title" required>LifeLine Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Young Adults Bible Study"
                error={validationErrors.title}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="subtitle">Subtitle (Optional)</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                placeholder="Brief subtitle or tagline"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => handleInputChange('description', value)}
                placeholder="Describe what this LifeLine is about, what participants can expect, and any requirements..."
                minHeight={150}
                maxHeight={400}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="groupLeader" required>Group Leader Name</Label>
              <Input
                id="groupLeader"
                value={formData.groupLeader}
                onChange={(e) => handleInputChange('groupLeader', e.target.value)}
                placeholder="Leader's full name"
                error={validationErrors.groupLeader}
              />
            </div>

            <div>
              <Label htmlFor="leaderId">Leader Account (Optional)</Label>
              <select
                id="leaderId"
                value={formData.leaderId}
                onChange={(e) => handleInputChange('leaderId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select existing leader account...</option>
                {leaders.map(leader => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} ({leader.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Meeting Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Meeting Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="dayOfWeek">Day of Week</Label>
              <select
                id="dayOfWeek"
                value={formData.dayOfWeek}
                onChange={(e) => handleInputChange('dayOfWeek', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select day...</option>
                <option value="MONDAY">Monday</option>
                <option value="TUESDAY">Tuesday</option>
                <option value="WEDNESDAY">Wednesday</option>
                <option value="THURSDAY">Thursday</option>
                <option value="FRIDAY">Friday</option>
                <option value="SATURDAY">Saturday</option>
                <option value="SUNDAY">Sunday</option>
              </select>
            </div>

            <div>
              <Label htmlFor="meetingTime">Meeting Time</Label>
              <Input
                id="meetingTime"
                value={formData.meetingTime}
                onChange={(e) => handleInputChange('meetingTime', e.target.value)}
                placeholder="e.g., 7:00 PM - 8:30 PM"
              />
            </div>

            <div>
              <Label htmlFor="meetingFrequency">Meeting Frequency</Label>
              <select
                id="meetingFrequency"
                value={formData.meetingFrequency}
                onChange={(e) => handleInputChange('meetingFrequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select frequency...</option>
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Biweekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="AS_NEEDED">As Needed</option>
              </select>
            </div>

            <div>
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                placeholder="e.g., 1.5 hours, 8 weeks"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Meeting location or address"
              />
            </div>
          </div>
        </div>

        {/* Group Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Group Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="groupType">Group Type</Label>
              <select
                id="groupType"
                value={formData.groupType}
                onChange={(e) => handleInputChange('groupType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select type...</option>
                <option value="MEN_ONLY">Men Only</option>
                <option value="WOMEN_ONLY">Women Only</option>
                <option value="MIXED">Mixed (Men & Women)</option>
                <option value="COUPLES">Couples</option>
                <option value="FAMILIES">Families</option>
              </select>
            </div>

            <div>
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                placeholder="e.g., 12"
                error={validationErrors.maxParticipants}
              />
            </div>

            <div>
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)}
                placeholder="0.00"
                error={validationErrors.cost}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="childcare"
                checked={formData.childcare}
                onChange={(e) => handleInputChange('childcare', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <Label htmlFor="childcare" className="!mb-0">Childcare Available</Label>
            </div>
          </div>

          {/* Ages & Stages */}
          <div className="mt-6">
            <Label>Ages & Stages (Select all that apply)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              {AGES_STAGES_OPTIONS.map(stage => (
                <div key={stage} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`stage-${stage}`}
                    checked={formData.agesStages.includes(stage)}
                    onChange={(e) => handleAgesStagesChange(stage, e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label 
                    htmlFor={`stage-${stage}`} 
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    {stage}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Image & Media */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Image & Media</h2>
          
          <div className="space-y-4">
            <div>
              <Label>LifeLine Image</Label>
              <div className="mt-2">
                {formData.imageUrl ? (
                  <div className="relative">
                    <img
                      src={formData.imageUrl}
                      alt={formData.imageAlt || formData.title}
                      className="w-full max-w-md h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      onClick={() => handleInputChange('imageUrl', '')}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setShowImageSelector(true)}
                    variant="outline"
                    className="flex items-center"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Select Image
                  </Button>
                )}
              </div>
            </div>

            {formData.imageUrl && (
              <>
                <div>
                  <Label htmlFor="imageAlt">Image Alt Text</Label>
                  <Input
                    id="imageAlt"
                    value={formData.imageAlt}
                    onChange={(e) => handleInputChange('imageAlt', e.target.value)}
                    placeholder="Describe the image for accessibility"
                  />
                </div>

                <div>
                  <Label htmlFor="imageAttribution">Image Attribution</Label>
                  <Input
                    id="imageAttribution"
                    value={formData.imageAttribution}
                    onChange={(e) => handleInputChange('imageAttribution', e.target.value)}
                    placeholder="Photo credit or source"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Publishing Options */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Publishing Options</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="FULL">Full</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isVisible"
                checked={formData.isVisible}
                onChange={(e) => handleInputChange('isVisible', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <Label htmlFor="isVisible" className="!mb-0">Visible to public</Label>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              
              <Button
                type="button"
                onClick={(e) => handleSubmit(e, 'published')}
                disabled={loading}
              >
                <Check className="h-4 w-4 mr-2" />
                {loading ? 'Publishing...' : 'Publish LifeLine'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Image Selector Modal */}
      {showImageSelector && (
        <ImageSelector
          onSelect={(imageData) => {
            handleInputChange('imageUrl', imageData.url)
            handleInputChange('imageAlt', imageData.alt)
            handleInputChange('imageAttribution', imageData.attribution)
            setShowImageSelector(false)
          }}
          onClose={() => setShowImageSelector(false)}
        />
      )}
    </div>
  )
}