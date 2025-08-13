import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/api-utils'
import { createSupportTicketResponseSchema } from '@/lib/validations'
import { canViewSupportTickets } from '@/lib/auth-utils'
import { UserRole, TicketStatus } from '@prisma/client'

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

    // TODO: Add proper permission checks in production
    // if (!canViewSupportTickets(session.user.id, ticket.requesterId, session.user.role)) {
    //   return createErrorResponse('You can only respond to your own support tickets', 403)
    // }

    // TODO: Get actual user ID from session in production
    const mockUserId = 'temp-user-id' // Replace with actual user session

    // Create the response
    const response = await prisma.ticketResponse.create({
      data: {
        ...validatedData,
        ticketId: id,
        authorId: mockUserId, // TODO: Replace with session.user.id in production
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
    // TODO: Implement proper role-based status updates in production
    await prisma.supportTicket.update({
      where: { id },
      data: { 
        status: TicketStatus.IN_PROGRESS,
        updatedAt: new Date()
      }
    })

    return createSuccessResponse(response, 'Response added successfully')
  } catch (error) {
    console.error('Error creating ticket response:', error)
    return createErrorResponse('Failed to create ticket response', 500)
  }
}