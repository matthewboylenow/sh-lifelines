import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse,
  withAuth
} from '@/lib/api-utils'
import { updateSupportTicketSchema } from '@/lib/validations'
import { canViewSupportTickets } from '@/lib/auth-utils'
import { UserRole, TicketStatus } from '@prisma/client'
import { sendSupportTicketResolvedEmail } from '@/lib/email'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/support-tickets/[id] - Get specific support ticket
export async function GET(req: NextRequest, context: RouteParams) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const { params } = context
      const { id } = await params

      const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        include: {
          requester: {
            select: {
              id: true,
              displayName: true,
              email: true,
            }
          },
          responses: {
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
          }
        }
      })

      if (!ticket) {
        return createErrorResponse('Support ticket not found', 404)
      }

      // Check permissions
      if (!canViewSupportTickets(session.user.id, ticket.requesterId, session.user.role)) {
        return createErrorResponse('You can only view your own support tickets', 403)
      }

      return createSuccessResponse(ticket)
    } catch (error) {
      console.error('Error fetching support ticket:', error)
      return createErrorResponse('Failed to fetch support ticket', 500)
    }
  })(req)
}

// PUT /api/support-tickets/[id] - Update support ticket
export async function PUT(req: NextRequest, context: RouteParams) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const { params } = context
      const { id } = await params

      const body = await req.json()
      const validatedData = updateSupportTicketSchema.parse(body)

      // Check if ticket exists
      const existingTicket = await prisma.supportTicket.findUnique({
        where: { id },
      })

      if (!existingTicket) {
        return createErrorResponse('Support ticket not found', 404)
      }

      // Check permissions
      const isSupport = [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN].includes(session.user.role)
      const isOwner = existingTicket.requesterId === session.user.id

      if (!isSupport && !isOwner) {
        return createErrorResponse('You can only update your own support tickets', 403)
      }

      const updateData: any = {}
      let wasResolvedNow = false
      
      // Support team can update status and priority
      if (isSupport) {
        if (validatedData.status) {
          updateData.status = validatedData.status
          if (validatedData.status === TicketStatus.RESOLVED) {
            updateData.resolvedAt = new Date()
            wasResolvedNow = existingTicket.status !== TicketStatus.RESOLVED
          }
        }
        if (validatedData.priority) updateData.priority = validatedData.priority
      }

      // Owners can update subject and description (if not resolved)
      if (isOwner && existingTicket.status !== TicketStatus.RESOLVED) {
        if (validatedData.subject) updateData.subject = validatedData.subject
        if (validatedData.description) updateData.description = validatedData.description
      }

      if (Object.keys(updateData).length === 0) {
        return createErrorResponse('No valid fields to update', 400)
      }

      const ticket = await prisma.supportTicket.update({
        where: { id },
        data: updateData,
        include: {
          requester: {
            select: {
              id: true,
              displayName: true,
              email: true,
            }
          },
          responses: {
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
          }
        }
      })

      // Send resolved email notification if ticket was just resolved
      if (wasResolvedNow) {
        try {
          await sendSupportTicketResolvedEmail({
            referenceNumber: ticket.referenceNumber || 'Unknown',
            subject: ticket.subject,
            requester: {
              ...ticket.requester,
              displayName: ticket.requester.displayName || ticket.requester.email
            }
          })
        } catch (emailError) {
          console.error('Failed to send ticket resolved email:', emailError)
          // Don't fail the update if email fails
        }
      }

      return createSuccessResponse(ticket, 'Support ticket updated successfully')
    } catch (error) {
      console.error('Error updating support ticket:', error)
      return createErrorResponse('Failed to update support ticket', 500)
    }
  })(req)
}