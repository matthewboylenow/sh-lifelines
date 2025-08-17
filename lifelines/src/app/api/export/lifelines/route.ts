import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/api-utils'
import { UserRole } from '@prisma/client'

// GET /api/export/lifelines - Export LifeLines data as CSV
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check authentication and authorization
    if (!session) {
      return createErrorResponse('Unauthorized', 401)
    }

    const allowedRoles: UserRole[] = [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN]
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return createErrorResponse('Insufficient permissions', 403)
    }

    // Fetch LifeLines data with related information
    const lifeLines = await prisma.lifeLine.findMany({
      include: {
        leader: {
          select: {
            id: true,
            email: true,
            displayName: true
          }
        },
        _count: {
          select: {
            inquiries: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Convert to CSV format
    const csvHeaders = [
      'ID',
      'Title',
      'Subtitle',
      'Description',
      'Group Leader',
      'Leader Email',
      'Status',
      'Group Type',
      'Ages/Stages',
      'Day of Week',
      'Meeting Time',
      'Meeting Frequency',
      'Location',
      'Max Participants',
      'Duration',
      'Cost',
      'Childcare Available',
      'Image URL',
      'Inquiry Count',
      'Created Date',
      'Updated Date'
    ].join(',')

    const csvRows = lifeLines.map(lifeline => [
      lifeline.id,
      `"${(lifeline.title || '').replace(/"/g, '""')}"`,
      `"${(lifeline.subtitle || '').replace(/"/g, '""')}"`,
      `"${(lifeline.description || '').replace(/"/g, '""')}"`,
      `"${(lifeline.groupLeader || '').replace(/"/g, '""')}"`,
      `"${(lifeline.leader?.email || lifeline.leaderEmail || '').replace(/"/g, '""')}"`,
      lifeline.status,
      lifeline.groupType || '',
      `"${(lifeline.agesStages || []).join(', ').replace(/"/g, '""')}"`,
      lifeline.dayOfWeek || '',
      `"${(lifeline.meetingTime || '').replace(/"/g, '""')}"`,
      lifeline.meetingFrequency || '',
      `"${(lifeline.location || '').replace(/"/g, '""')}"`,
      lifeline.maxParticipants || '',
      `"${(lifeline.duration || '').replace(/"/g, '""')}"`,
      lifeline.cost || '',
      lifeline.childcare ? 'Yes' : 'No',
      `"${(lifeline.imageUrl || '').replace(/"/g, '""')}"`,
      lifeline._count.inquiries,
      lifeline.createdAt.toISOString(),
      lifeline.updatedAt.toISOString()
    ].join(','))

    const csvContent = [csvHeaders, ...csvRows].join('\n')

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="lifelines-export.csv"',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('LifeLines export error:', error)
    return createErrorResponse('Export failed', 500)
  }
}