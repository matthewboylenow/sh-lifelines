import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  parsePaginationParams,
  createPaginatedResponse 
} from '@/lib/api-utils'
import { createFormationRequestSchema } from '@/lib/validations'
import { FormationStatus } from '@prisma/client'
import { sendFormationRequestNotification } from '@/lib/email'

// GET /api/formation-requests - List formation requests with filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePaginationParams(searchParams)
    
    // Parse filters
    const filters = {
      status: searchParams.get('status') as FormationStatus | undefined,
      groupType: searchParams.get('groupType'),
      search: searchParams.get('search'),
    }

    // Build where clause
    const where: any = {}

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.groupType) {
      where.groupType = filters.groupType
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { groupLeader: { contains: filters.search, mode: 'insensitive' } },
        { leaderEmail: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [requests, total] = await Promise.all([
      prisma.formationRequest.findMany({
        where,
        include: {
          submitter: {
            select: {
              id: true,
              displayName: true,
              email: true,
            }
          },
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                }
              }
            }
          },
          comments: {
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
              createdAt: 'desc'
            }
          },
          createdLifeLine: true,
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.formationRequest.count({ where })
    ])

    return createSuccessResponse(
      createPaginatedResponse(requests, total, page, limit)
    )
  } catch (error) {
    console.error('Error fetching formation requests:', error)
    return createErrorResponse('Failed to fetch formation requests', 500)
  }
}

// POST /api/formation-requests - Create new formation request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = createFormationRequestSchema.parse(body)

    // Create the formation request
    const formationRequest = await prisma.formationRequest.create({
      data: {
        ...validatedData,
        status: FormationStatus.SUBMITTED,
        // Schedule auto-approval for 48 hours from now
        autoApprovalScheduled: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
      include: {
        submitter: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        }
      }
    })

    // Send notification to formation support team
    try {
      await sendFormationRequestNotification({
        title: formationRequest.title,
        groupLeader: formationRequest.groupLeader,
        leaderEmail: formationRequest.leaderEmail,
        description: formationRequest.description || undefined,
      })
    } catch (emailError) {
      console.error('Failed to send formation request notification:', emailError)
      // Don't fail the request creation if email fails
    }

    return createSuccessResponse(formationRequest, 'Formation request submitted successfully')
  } catch (error) {
    console.error('Error creating formation request:', error)
    return createErrorResponse('Failed to create formation request', 500)
  }
}