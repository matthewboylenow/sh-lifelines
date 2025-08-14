import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse,
  parsePaginationParams,
  createPaginatedResponse,
  withAuth 
} from '@/lib/api-utils'
import { createSupportTicketSchema, supportTicketFiltersSchema } from '@/lib/validations'
import { UserRole, TicketStatus, TicketPriority } from '@prisma/client'
import { generateReferenceNumber } from '@/utils/formatters'
import { sendSupportTicketCreatedEmail } from '@/lib/email'

// GET /api/support-tickets - List support tickets with filtering
export async function GET(req: NextRequest) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {

    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePaginationParams(searchParams)
    
    // Parse filters
    const filters = {
      status: searchParams.get('status') as TicketStatus | undefined,
      priority: searchParams.get('priority') as TicketPriority | undefined,
      search: searchParams.get('search'),
      requesterId: searchParams.get('requesterId'),
    }

    // Build where clause
    const where: any = {}

    // Filter by user role - non-support users can only see their own tickets
    const isSupport = [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN].includes(session.user.role)
    if (!isSupport) {
      where.requesterId = session.user.id
    } else if (filters.requesterId) {
      where.requesterId = filters.requesterId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.priority) {
      where.priority = filters.priority
    }

    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { referenceNumber: { contains: filters.search, mode: 'insensitive' } },
        { requester: { displayName: { contains: filters.search, mode: 'insensitive' } } },
        { requester: { email: { contains: filters.search, mode: 'insensitive' } } },
      ]
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
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
          },
          _count: {
            select: {
              responses: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' }, // High priority first
          { createdAt: 'desc' }  // Then newest first
        ],
        skip,
        take: limit,
      }),
      prisma.supportTicket.count({ where })
    ])

      return createSuccessResponse(
        createPaginatedResponse(tickets, total, page, limit)
      )
    } catch (error) {
      console.error('Error fetching support tickets:', error)
      return createErrorResponse('Failed to fetch support tickets', 500)
    }
  })(req)
}

// POST /api/support-tickets - Create new support ticket
export async function POST(req: NextRequest) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const body = await req.json()
      const validatedData = createSupportTicketSchema.parse(body)

      const ticket = await prisma.supportTicket.create({
        data: {
          ...validatedData,
          referenceNumber: generateReferenceNumber(),
          requesterId: session.user.id,
          status: TicketStatus.PENDING_REVIEW,
          priority: validatedData.priority || TicketPriority.MEDIUM,
        },
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

      // Send notification emails
      try {
        await sendSupportTicketCreatedEmail({
          referenceNumber: ticket.referenceNumber!,
          subject: ticket.subject,
          description: ticket.description || '',
          priority: ticket.priority,
          requester: ticket.requester
        })
      } catch (emailError) {
        console.error('Failed to send support ticket creation email:', emailError)
        // Don't fail the ticket creation if email fails
      }

      return createSuccessResponse(ticket, 'Support ticket created successfully')
    } catch (error) {
      console.error('Error creating support ticket:', error)
      return createErrorResponse('Failed to create support ticket', 500)
    }
  })(req)
}