import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Fetch stats in parallel for better performance
    const [
      totalLifeLines,
      totalUsers,
      activeLeaders,
      pendingFormationRequests,
      totalInquiries,
      hiddenLifeLines
    ] = await Promise.all([
      // Total LifeLines
      prisma.lifeLine.count().catch(() => 0),

      // Total Users
      prisma.user.count().catch(() => 0),

      // Active Leaders (users with LIFELINE_LEADER role or higher)
      prisma.user.count({
        where: {
          role: {
            in: [UserRole.LIFELINE_LEADER, UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN]
          }
        }
      }).catch(() => 0),

      // Pending Formation Requests (check for SUBMITTED status instead of PENDING)
      prisma.formationRequest.count({
        where: {
          status: 'SUBMITTED'
        }
      }).catch(() => 0),

      // Total Inquiries
      prisma.inquiry.count().catch(() => 0),

      // Hidden LifeLines (archived or not visible)
      prisma.lifeLine.count({
        where: {
          OR: [
            { status: 'ARCHIVED' },
            { isVisible: false }
          ]
        }
      }).catch(() => 0)
    ])

    const stats = {
      totalLifeLines,
      totalUsers,
      activeLeaders,
      pendingFormationRequests,
      totalInquiries,
      hiddenLifeLines
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch admin statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}