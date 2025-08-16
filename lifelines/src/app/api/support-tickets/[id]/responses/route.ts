import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse,
  withAuth
} from '@/lib/api-utils'
import { createSupportTicketResponseSchema } from '@/lib/validations'
import { canViewSupportTickets } from '@/lib/auth-utils'
import { UserRole, TicketStatus } from '@prisma/client'
import { sendSupportTicketResponseEmail } from '@/lib/email'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/support-tickets/[id]/responses - List ticket responses
export async function GET(req: NextRequest, context: RouteParams) {
  try {
    const { params } = context
    const { id } = await params

    // First check if ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { requesterId: true }
    })

    if (!ticket) {
      return createErrorResponse('Support ticket not found', 404)
    }

    // TODO: Add proper permission checks in production
    // if (!canViewSupportTickets(session.user.id, ticket.requesterId, session.user.role)) {
    //   return createErrorResponse('You can only view responses for your own support tickets', 403)
    // }

    const responses = await prisma.ticketResponse.findMany({
      where: { ticketId: id },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return createSuccessResponse({ items: responses })
  } catch (error) {
    console.error('Error fetching ticket responses:', error)
    return createErrorResponse('Failed to fetch ticket responses', 500)
  }
}

// POST /api/support-tickets/[id]/responses - Add response to ticket
export async function POST(req: NextRequest, context: RouteParams) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const { params } = context
      const { id } = await params

      const body = await req.json()
      const validatedData = createSupportTicketResponseSchema.parse(body)

      // Check if ticket exists
      const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        include: {
          requester: {
            select: {
              id: true,
              displayName: true,
              email: true,
            }
          }
        }
      })

      if (!ticket) {
        return createErrorResponse('Support ticket not found', 404)
      }

      // Check permissions
      if (!canViewSupportTickets(session.user.id, ticket.requesterId, session.user.role)) {
        return createErrorResponse('You can only respond to your own support tickets', 403)
      }

      // Create the response
      const response = await prisma.ticketResponse.create({
        data: {
          ...validatedData,
          ticketId: id,
          authorId: session.user.id,
        },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
            }
          }
        }
      })

      // Update ticket status and timestamp
      const isSupport = [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN].includes(session.user.role)
      await prisma.supportTicket.update({
        where: { id },
        data: { 
          status: isSupport && ticket.status === TicketStatus.PENDING_REVIEW 
            ? TicketStatus.IN_PROGRESS 
            : ticket.status,
          updatedAt: new Date()
        }
      })

      // Send response notification email
      try {
        await sendSupportTicketResponseEmail(
          {
            referenceNumber: ticket.referenceNumber || 'Unknown',
            subject: ticket.subject,
            requester: {
              ...ticket.requester,
              displayName: ticket.requester.displayName || ticket.requester.email
            }
          },
          {
            content: response.content,
            isFromSupport: isSupport,
            author: {
              ...response.author,
              displayName: response.author.displayName || response.author.email
            }
          }
        )
      } catch (emailError) {
        console.error('Failed to send response notification email:', emailError)
        // Don't fail the response creation if email fails
      }

      return createSuccessResponse(response, 'Response added successfully')
    } catch (error) {
      console.error('Error creating ticket response:', error)
      return createErrorResponse('Failed to create ticket response', 500)
    }
  })(req)
}