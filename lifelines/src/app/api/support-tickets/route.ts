import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse,
  parsePaginationParams,
  createPaginatedResponse 
} from '@/lib/api-utils'
import { createSupportTicketSchema, supportTicketFiltersSchema } from '@/lib/validations'
import { UserRole, TicketStatus, TicketPriority } from '@prisma/client'
import { generateReferenceNumber } from '@/utils/formatters'

// GET /api/support-tickets - List support tickets with filtering
export async function GET(req: NextRequest) {
  try {
    // TODO: Add authentication middleware back in production
    // For now, showing all tickets - in production should filter by user role

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

    // TODO: Implement proper user role filtering in production
    // if (![UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN].includes(session.user.role)) {
    //   where.requesterId = session.user.id
    // } else if (filters.requesterId) {
    //   where.requesterId = filters.requesterId
    // }

    if (filters.requesterId) {
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
}

// POST /api/support-tickets - Create new support ticket
export async function POST(req: NextRequest) {
  try {
    // TODO: Add authentication middleware back in production
    // Currently allowing access for build purposes

    const body = await req.json()
    const validatedData = createSupportTicketSchema.parse(body)

    // TODO: Get actual user ID from session in production
    const mockUserId = 'temp-user-id' // Replace with actual user session

    const ticket = await prisma.supportTicket.create({
      data: {
        ...validatedData,
        referenceNumber: generateReferenceNumber(),
        requesterId: mockUserId, // TODO: Replace with session.user.id in production
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

    return createSuccessResponse(ticket, 'Support ticket created successfully')
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return createErrorResponse('Failed to create support ticket', 500)
  }
}