import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  parsePaginationParams,
  createPaginatedResponse 
} from '@/lib/api-utils'
import { createLifeLineSchema } from '@/lib/validations'
import { LifeLineStatus, GroupType, MeetingFrequency, DayOfWeek } from '@prisma/client'

// GET /api/lifelines - List LifeLines with filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePaginationParams(searchParams)
    
    // Parse filters
    const filters = {
      status: searchParams.get('status') as LifeLineStatus | undefined,
      groupType: searchParams.get('groupType') as GroupType | undefined,
      meetingFrequency: searchParams.get('meetingFrequency') as MeetingFrequency | undefined,
      dayOfWeek: searchParams.get('dayOfWeek') as DayOfWeek | undefined,
      search: searchParams.get('search'),
      leaderId: searchParams.get('leaderId'),
      agesStages: searchParams.get('agesStages')?.split(','),
    }

    // Build where clause
    const where: any = {}

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.groupType) {
      where.groupType = filters.groupType
    }

    if (filters.meetingFrequency) {
      where.meetingFrequency = filters.meetingFrequency
    }

    if (filters.dayOfWeek) {
      where.dayOfWeek = filters.dayOfWeek
    }

    if (filters.leaderId) {
      where.leaderId = filters.leaderId
    }

    if (filters.agesStages && filters.agesStages.length > 0) {
      where.agesStages = {
        hasSome: filters.agesStages
      }
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { groupLeader: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [lifeLines, total] = await Promise.all([
      prisma.lifeLine.findMany({
        where,
        include: {
          leader: {
            select: {
              id: true,
              displayName: true,
              email: true,
            }
          },
          _count: {
            select: {
              inquiries: true
            }
          }
        },
        orderBy: [
          { status: 'asc' }, // Published first
          { createdAt: 'desc' }
        ],
        skip,
        take: limit,
      }),
      prisma.lifeLine.count({ where })
    ])

    return createSuccessResponse(
      createPaginatedResponse(lifeLines, total, page, limit)
    )
  } catch (error) {
    console.error('Error fetching LifeLines:', error)
    return createErrorResponse('Failed to fetch LifeLines', 500)
  }
}

// POST /api/lifelines - Create new LifeLine
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = createLifeLineSchema.parse(body)

    // For now, use a dummy leader ID - in production this should come from session
    const dummyLeaderId = 'leader-user-id'

    const lifeLine = await prisma.lifeLine.create({
      data: {
        ...validatedData,
        status: LifeLineStatus.DRAFT, // Start as draft
        leaderId: dummyLeaderId,
        groupLeader: 'Leader Name', // This should come from authenticated user
        leaderEmail: 'leader@example.com', // This should come from authenticated user
      },
      include: {
        leader: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        },
        _count: {
          select: {
            inquiries: true
          }
        }
      }
    })

    return createSuccessResponse(lifeLine, 'LifeLine created successfully')
  } catch (error) {
    console.error('Error creating LifeLine:', error)
    return createErrorResponse('Failed to create LifeLine', 500)
  }
}