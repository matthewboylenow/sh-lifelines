import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
  withAuth
} from '@/lib/api-utils'
import { UserRole } from '@prisma/client'
import { sendLeaderMemberEmail } from '@/lib/email'
import { z } from 'zod'

const emailSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(1, 'Message is required').max(10000),
  recipientFilter: z.enum(['all', 'joined', 'pending']).default('joined')
})

// POST /api/lifelines/[id]/email - Send email to members
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const { id } = await params
      const body = await req.json()
      const validatedData = emailSchema.parse(body)

      // Get the LifeLine with leader info
      const lifeLine = await prisma.lifeLine.findUnique({
        where: { id },
        include: {
          leader: {
            select: {
              id: true,
              displayName: true,
              email: true
            }
          },
          inquiries: {
            where: validatedData.recipientFilter === 'all'
              ? {}
              : validatedData.recipientFilter === 'joined'
              ? { status: 'JOINED' }
              : { status: 'UNDECIDED' },
            select: {
              personEmail: true,
              personName: true,
              status: true
            }
          }
        }
      })

      if (!lifeLine) {
        return createErrorResponse('LifeLine not found', 404)
      }

      // Check if user can send emails (must be leader, admin, or formation support)
      const isAuthorized =
        session.user.role === UserRole.ADMIN ||
        session.user.role === UserRole.FORMATION_SUPPORT_TEAM ||
        lifeLine.leaderId === session.user.id

      if (!isAuthorized) {
        return createErrorResponse('You do not have permission to send emails for this LifeLine', 403)
      }

      // Get recipient emails (filter out null/empty emails)
      const recipientEmails = lifeLine.inquiries
        .map(i => i.personEmail)
        .filter((email): email is string => !!email && email.length > 0)

      if (recipientEmails.length === 0) {
        return createErrorResponse('No members with email addresses found', 400)
      }

      // Get leader info
      const leader = lifeLine.leader || {
        displayName: lifeLine.groupLeader,
        email: lifeLine.leaderEmail
      }

      // Send the email
      const result = await sendLeaderMemberEmail(
        {
          displayName: leader.displayName || lifeLine.groupLeader,
          email: leader.email || lifeLine.leaderEmail
        },
        lifeLine.title,
        recipientEmails,
        validatedData.subject,
        validatedData.message
      )

      return createSuccessResponse({
        sent: true,
        recipientCount: result.totalRecipients,
        batches: result.batches
      }, `Email sent to ${result.totalRecipients} member(s)`)

    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(error.issues[0].message, 400)
      }
      console.error('Error sending member email:', error)
      return createErrorResponse('Failed to send email', 500)
    }
  })(req)
}

// GET /api/lifelines/[id]/email - Get member email addresses (for preview)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const { id } = await params
      const { searchParams } = new URL(req.url)
      const filter = searchParams.get('filter') || 'joined'

      // Get the LifeLine with inquiries
      const lifeLine = await prisma.lifeLine.findUnique({
        where: { id },
        include: {
          inquiries: {
            where: filter === 'all'
              ? {}
              : filter === 'joined'
              ? { status: 'JOINED' }
              : { status: 'UNDECIDED' },
            select: {
              id: true,
              personName: true,
              personEmail: true,
              status: true
            }
          }
        }
      })

      if (!lifeLine) {
        return createErrorResponse('LifeLine not found', 404)
      }

      // Check if user can view members
      const isAuthorized =
        session.user.role === UserRole.ADMIN ||
        session.user.role === UserRole.FORMATION_SUPPORT_TEAM ||
        lifeLine.leaderId === session.user.id

      if (!isAuthorized) {
        return createErrorResponse('You do not have permission to view members of this LifeLine', 403)
      }

      const recipients = lifeLine.inquiries
        .filter(i => i.personEmail)
        .map(i => ({
          name: i.personName,
          email: i.personEmail,
          status: i.status
        }))

      return createSuccessResponse({
        lifeLineTitle: lifeLine.title,
        recipients,
        totalCount: recipients.length
      })

    } catch (error) {
      console.error('Error fetching member emails:', error)
      return createErrorResponse('Failed to fetch members', 500)
    }
  })(req)
}
