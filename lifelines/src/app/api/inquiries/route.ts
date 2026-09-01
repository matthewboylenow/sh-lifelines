import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  parsePaginationParams,
  createPaginatedResponse 
} from '@/lib/api-utils'
import { createInquirySchema } from '@/lib/validations'
import { InquiryStatus, UserRole } from '@prisma/client'
import { sendInquiryNotification } from '@/lib/email'
import { ZodError } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasAnyRole } from '@/lib/auth-utils'

// GET /api/inquiries - List inquiries with filtering
//
// These are parishioners' names, email addresses and phone numbers. This
// endpoint had no authentication at all, so the whole list was readable by
// anyone who knew the URL. It is now limited to the people who need it, and a
// leader sees only the groups they actually lead.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const isStaff = hasAnyRole(session.user.roles, [
      UserRole.ADMIN,
      UserRole.FORMATION_SUPPORT_TEAM,
    ])
    const isLeader = hasAnyRole(session.user.roles, [UserRole.LIFELINE_LEADER])

    if (!isStaff && !isLeader) {
      return createErrorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePaginationParams(searchParams)
    
    // Parse filters
    const filters = {
      status: searchParams.get('status') as InquiryStatus | undefined,
      lifeLineId: searchParams.get('lifeLineId'),
      leaderId: searchParams.get('leaderId'),
      search: searchParams.get('search'),
      recent: searchParams.get('recent') === 'true',
    }

    // Build where clause
    const where: any = {}

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.lifeLineId) {
      where.lifeLineId = filters.lifeLineId
    }

    // A leader is pinned to their own groups whatever leaderId says, so the
    // parameter cannot be used to read someone else's members.
    if (!isStaff) {
      where.lifeLine = { leaders: { some: { id: session.user.id } } }
    } else if (filters.leaderId) {
      where.lifeLine = { leaders: { some: { id: filters.leaderId } } }
    }

    if (filters.search) {
      where.OR = [
        { personName: { contains: filters.search, mode: 'insensitive' } },
        { personEmail: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } },
        { lifeLine: { title: { contains: filters.search, mode: 'insensitive' } } },
      ]
    }

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: {
          lifeLine: {
            include: {
              leaders: {
            select: {
                  id: true,
                  displayName: true,
                  email: true,
                }
          }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: filters.recent ? 0 : skip,
        take: filters.recent ? 10 : limit,
      }),
      prisma.inquiry.count({ where })
    ])

    return createSuccessResponse(
      filters.recent 
        ? { items: inquiries, total }
        : createPaginatedResponse(inquiries, total, page, limit)
    )
  } catch (error) {
    console.error('Error fetching inquiries:', error)
    return createErrorResponse('Failed to fetch inquiries', 500)
  }
}

// POST /api/inquiries - Create new inquiry (public endpoint)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = createInquirySchema.parse(body)

    // Get the LifeLine and leader info
    const lifeLine = await prisma.lifeLine.findUnique({
      where: { id: validatedData.lifeLineId },
      include: {
        leaders: true,
        _count: { select: { children: true } },
      }
    })

    if (!lifeLine) {
      return createErrorResponse('LifeLine not found', 404)
    }

    if (lifeLine.status !== 'PUBLISHED') {
      return createErrorResponse('This LifeLine is not accepting inquiries', 400)
    }

    // A parent is a heading, not a group with a meeting time. Joining it would
    // leave someone in no actual group, so they are sent to pick a subgroup.
    if (lifeLine._count.children > 0) {
      return createErrorResponse(
        'Please choose one of the groups listed under this LifeLine, so we know which time suits you',
        400
      )
    }

    // Create the inquiry with source tracking
    const inquiry = await prisma.inquiry.create({
      data: {
        personName: validatedData.personName,
        personEmail: validatedData.personEmail,
        personPhone: validatedData.personPhone,
        message: validatedData.message,
        lifeLineId: validatedData.lifeLineId,
        source: validatedData.source || 'PUBLIC_WEBSITE',
      },
      include: {
        lifeLine: {
          include: {
            leaders: {
            select: {
                id: true,
                displayName: true,
                email: true,
              }
          }
          }
        }
      }
    })

    // Notify every leader of the group, not just one
    for (const leader of lifeLine.leaders) {
      try {
        await sendInquiryNotification(
          leader.email,
          leader.displayName || lifeLine.groupLeader || 'LifeLine Leader',
          lifeLine.title,
          {
            personName: inquiry.personName,
            personEmail: inquiry.personEmail || undefined,
            message: inquiry.message || undefined,
          }
        )
      } catch (emailError) {
        console.error('Failed to send inquiry notification:', emailError)
        // Don't fail the inquiry creation if email fails
      }
    }

    return createSuccessResponse(inquiry, 'Inquiry submitted successfully')
  } catch (error) {
    console.error('Error creating inquiry:', error)

    // Surface validation problems as 400s. Returning a blanket 500 previously
    // masked a client/schema field-name mismatch as a server fault.
    if (error instanceof ZodError) {
      const details = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return createErrorResponse(`Validation error: ${details}`, 400)
    }

    return createErrorResponse('Failed to create inquiry', 500)
  }
}