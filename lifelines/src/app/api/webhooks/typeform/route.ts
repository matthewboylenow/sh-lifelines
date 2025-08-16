import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/api-utils'
import { FormationStatus, GroupType, MeetingFrequency, DayOfWeek } from '@prisma/client'
import { sendFormationRequestNotification } from '@/lib/email'

interface TypeformAnswer {
  field: {
    id: string
    type: string
    ref: string
  }
  type: string
  text?: string
  email?: string
  phone_number?: string
  choice?: {
    id: string
    label: string
    ref: string
  }
  choices?: {
    ids: string[]
    labels: string[]
    refs: string[]
  }
}

interface TypeformWebhookPayload {
  event_id: string
  event_type: string
  form_response: {
    form_id: string
    token: string
    submitted_at: string
    answers: TypeformAnswer[]
  }
}

// Typeform field mapping configuration
// These field IDs should match the actual Typeform field IDs in production
const FIELD_MAPPING = {
  groupLeader: 'group_leader',
  leaderEmail: 'leader_email', 
  cellPhone: 'cell_phone',
  title: 'lifeline_title',
  description: 'lifeline_description',
  agesStages: 'ages_stages',
  groupType: 'group_type',
  meetingFrequency: 'meeting_frequency',
  dayOfWeek: 'day_of_week',
  meetingTime: 'meeting_time'
}

// Value mapping for enum fields
const VALUE_MAPPING = {
  groupType: {
    'Social/Fellowship': GroupType.SOCIAL,
    'Activity Based': GroupType.ACTIVITY,
    'Scripture Based': GroupType.SCRIPTURE_BASED,
    'Sunday Based': GroupType.SUNDAY_BASED,
    'social': GroupType.SOCIAL,
    'activity': GroupType.ACTIVITY,
    'scripture': GroupType.SCRIPTURE_BASED,
    'sunday': GroupType.SUNDAY_BASED
  },
  meetingFrequency: {
    'Weekly': MeetingFrequency.WEEKLY,
    'Bi-weekly': MeetingFrequency.MONTHLY, // Map to closest available value
    'Monthly': MeetingFrequency.MONTHLY,
    'Quarterly': MeetingFrequency.SEASONALLY, // Map seasonal to SEASONALLY
    'As Needed': MeetingFrequency.SEASONALLY,
    'weekly': MeetingFrequency.WEEKLY,
    'biweekly': MeetingFrequency.MONTHLY,
    'monthly': MeetingFrequency.MONTHLY,
    'quarterly': MeetingFrequency.SEASONALLY,
    'as-needed': MeetingFrequency.SEASONALLY
  },
  dayOfWeek: {
    'Sunday': DayOfWeek.SUNDAY,
    'Monday': DayOfWeek.MONDAY,
    'Tuesday': DayOfWeek.TUESDAY,
    'Wednesday': DayOfWeek.WEDNESDAY,
    'Thursday': DayOfWeek.THURSDAY,
    'Friday': DayOfWeek.FRIDAY,
    'Saturday': DayOfWeek.SATURDAY,
    'Varies': DayOfWeek.VARIES,
    'sunday': DayOfWeek.SUNDAY,
    'monday': DayOfWeek.MONDAY,
    'tuesday': DayOfWeek.TUESDAY,
    'wednesday': DayOfWeek.WEDNESDAY,
    'thursday': DayOfWeek.THURSDAY,
    'friday': DayOfWeek.FRIDAY,
    'saturday': DayOfWeek.SATURDAY,
    'varies': DayOfWeek.VARIES
  }
}

function verifyTypeformSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    console.warn('Typeform webhook secret not configured')
    return true // Skip verification in development
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64')
  
  return signature === `sha256=${expectedSignature}`
}

function extractAnswerValue(answer: TypeformAnswer): string | null {
  switch (answer.type) {
    case 'text':
    case 'long_text':
      return answer.text || null
    case 'email':
      return answer.email || null
    case 'phone_number':
      return answer.phone_number || null
    case 'choice':
      return answer.choice?.label || null
    case 'choices':
      return answer.choices?.labels.join(', ') || null
    default:
      return null
  }
}

function mapTypeformData(answers: TypeformAnswer[]): Partial<any> {
  const data: any = {}

  // Create a map of field refs to answers for easier lookup
  const answerMap = new Map<string, string | null>()
  
  answers.forEach(answer => {
    const value = extractAnswerValue(answer)
    answerMap.set(answer.field.ref, value)
  })

  // Map each field using the field mapping configuration
  Object.entries(FIELD_MAPPING).forEach(([dbField, typeformRef]) => {
    const value = answerMap.get(typeformRef)
    if (value) {
      // Apply value mapping for enum fields
      if (dbField === 'groupType' && VALUE_MAPPING.groupType[value as keyof typeof VALUE_MAPPING.groupType]) {
        data[dbField] = VALUE_MAPPING.groupType[value as keyof typeof VALUE_MAPPING.groupType]
      } else if (dbField === 'meetingFrequency' && VALUE_MAPPING.meetingFrequency[value as keyof typeof VALUE_MAPPING.meetingFrequency]) {
        data[dbField] = VALUE_MAPPING.meetingFrequency[value as keyof typeof VALUE_MAPPING.meetingFrequency]
      } else if (dbField === 'dayOfWeek' && VALUE_MAPPING.dayOfWeek[value as keyof typeof VALUE_MAPPING.dayOfWeek]) {
        data[dbField] = VALUE_MAPPING.dayOfWeek[value as keyof typeof VALUE_MAPPING.dayOfWeek]
      } else {
        data[dbField] = value
      }
    }
  })

  return data
}

// POST /api/webhooks/typeform - Handle Typeform webhook submissions
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('Typeform-Signature') || ''
    const secret = process.env.TYPEFORM_WEBHOOK_SECRET || ''

    // Verify webhook signature
    if (!verifyTypeformSignature(body, signature, secret)) {
      console.error('Invalid Typeform webhook signature')
      return createErrorResponse('Unauthorized', 401)
    }

    let webhookData: TypeformWebhookPayload
    try {
      webhookData = JSON.parse(body)
    } catch (parseError) {
      console.error('Invalid webhook payload format:', parseError)
      return createErrorResponse('Invalid payload format', 400)
    }

    // Only process form submission events
    if (webhookData.event_type !== 'form_response') {
      return createSuccessResponse({ message: 'Event type not processed' })
    }

    const { form_response } = webhookData

    // Extract and map form data
    const formData = mapTypeformData(form_response.answers)

    // Validate required fields
    if (!formData.groupLeader || !formData.leaderEmail) {
      console.error('Missing required fields:', { formData })
      return createErrorResponse('Missing required fields: groupLeader and leaderEmail', 400)
    }

    // Check for duplicate submissions using Typeform token
    const existingRequest = await prisma.formationRequest.findFirst({
      where: {
        // Use a combination of email and submission time to detect duplicates
        leaderEmail: formData.leaderEmail,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Within last 5 minutes
        }
      }
    })

    if (existingRequest) {
      console.log('Duplicate submission detected, ignoring:', {
        email: formData.leaderEmail,
        existingId: existingRequest.id
      })
      return createSuccessResponse({ 
        message: 'Duplicate submission ignored',
        existingRequestId: existingRequest.id
      })
    }

    // Create formation request
    const formationRequest = await prisma.formationRequest.create({
      data: {
        title: formData.title || 'Formation Request from Typeform',
        groupLeader: formData.groupLeader || 'Unknown Leader',
        leaderEmail: formData.leaderEmail || 'unknown@example.com',
        ...formData,
        status: FormationStatus.SUBMITTED,
        // Schedule auto-approval for 48 hours from now
        autoApprovalScheduled: new Date(Date.now() + 48 * 60 * 60 * 1000),
      }
    })

    console.log('Formation request created from Typeform:', {
      id: formationRequest.id,
      groupLeader: formationRequest.groupLeader,
      leaderEmail: formationRequest.leaderEmail,
      source: 'Typeform'
    })

    // Send notification to formation support team
    try {
      await sendFormationRequestNotification({
        title: formationRequest.title || `LifeLine Request from ${formationRequest.groupLeader}`,
        groupLeader: formationRequest.groupLeader,
        leaderEmail: formationRequest.leaderEmail,
        description: formationRequest.description || undefined,
      })
    } catch (emailError) {
      console.error('Failed to send formation request notification:', emailError)
      // Don't fail the webhook processing if email fails
    }

    return createSuccessResponse({
      message: 'Formation request created successfully',
      formationRequestId: formationRequest.id
    })

  } catch (error) {
    console.error('Typeform webhook error:', error)
    return createErrorResponse('Webhook processing failed', 500)
  }
}

// GET /api/webhooks/typeform - Webhook verification endpoint for Typeform
export async function GET(req: NextRequest) {
  // Typeform uses this endpoint to verify webhook configuration
  return createSuccessResponse({
    message: 'Typeform webhook endpoint is configured correctly',
    timestamp: new Date().toISOString()
  })
}