import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
  parsePaginationParams,
  createPaginatedResponse
} from '@/lib/api-utils'
import { InquiryStatus, UserRole } from '@prisma/client'

// GET /api/admin/inquiry-tracking - Get inquiry tracking data with stats
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return createErrorResponse('Unauthorized', 401)
    }

    // Only allow admin and formation support team
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.FORMATION_SUPPORT_TEAM]
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return createErrorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePaginationParams(searchParams)

    // Parse filters
    const status = searchParams.get('status') as InquiryStatus | null
    const lifeLineId = searchParams.get('lifeLineId')
    const leaderId = searchParams.get('leaderId')
    const search = searchParams.get('search')
    const needsAttention = searchParams.get('needsAttention') === 'true'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build where clause
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (lifeLineId) {
      where.lifeLineId = lifeLineId
    }

    if (leaderId) {
      where.lifeLine = { leaderId }
    }

    if (search) {
      where.OR = [
        { personName: { contains: search, mode: 'insensitive' } },
        { personEmail: { contains: search, mode: 'insensitive' } },
        { lifeLine: { title: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (needsAttention) {
      // Inquiries that are undecided and older than 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      where.status = 'UNDECIDED'
      where.createdAt = { lt: sevenDaysAgo }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo)
      }
    }

    // Get aggregated stats
    const [
      totalCount,
      undecidedCount,
      joinedCount,
      notJoinedCount,
      needsAttentionCount,
      recentWeekCount,
      inquiries
    ] = await Promise.all([
      prisma.inquiry.count(),
      prisma.inquiry.count({ where: { status: 'UNDECIDED' } }),
      prisma.inquiry.count({ where: { status: 'JOINED' } }),
      prisma.inquiry.count({ where: { status: 'NOT_JOINED' } }),
      prisma.inquiry.count({
        where: {
          status: 'UNDECIDED',
          createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.inquiry.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.inquiry.findMany({
        where,
        include: {
          lifeLine: {
            select: {
              id: true,
              title: true,
              groupLeader: true,
              leaderId: true,
              leader: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                }
              }
            }
          }
        },
        orderBy: [
          { status: 'asc' }, // UNDECIDED first
          { createdAt: 'desc' }
        ],
        skip,
        take: limit,
      })
    ])

    // Calculate join rate (of resolved inquiries)
    const totalResolved = joinedCount + notJoinedCount
    const joinRate = totalResolved > 0
      ? Math.round((joinedCount / totalResolved) * 100)
      : 0

    // Get count for current filter
    const filteredCount = await prisma.inquiry.count({ where })

    // Add computed fields to inquiries
    const enrichedInquiries = inquiries.map(inquiry => {
      const daysSinceRequest = Math.floor(
        (Date.now() - new Date(inquiry.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      const needsFollowUp = inquiry.status === 'UNDECIDED' && daysSinceRequest > 7

      return {
        ...inquiry,
        daysSinceRequest,
        needsFollowUp,
      }
    })

    // Get list of LifeLines and leaders for filters
    const [lifeLines, leaders] = await Promise.all([
      prisma.lifeLine.findMany({
        select: { id: true, title: true },
        orderBy: { title: 'asc' }
      }),
      prisma.user.findMany({
        where: { role: 'LIFELINE_LEADER' },
        select: { id: true, displayName: true, email: true },
        orderBy: { displayName: 'asc' }
      })
    ])

    return createSuccessResponse({
      stats: {
        total: totalCount,
        undecided: undecidedCount,
        joined: joinedCount,
        notJoined: notJoinedCount,
        needsAttention: needsAttentionCount,
        recentWeek: recentWeekCount,
        joinRate,
      },
      filters: {
        lifeLines,
        leaders,
      },
      ...createPaginatedResponse(enrichedInquiries, filteredCount, page, limit)
    })
  } catch (error) {
    console.error('Error fetching inquiry tracking data:', error)
    return createErrorResponse('Failed to fetch inquiry tracking data', 500)
  }
}
