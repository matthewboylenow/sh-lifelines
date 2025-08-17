import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/api-utils'
import { UserRole } from '@prisma/client'

// GET /api/export/formation-requests - Export formation requests as CSV
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

    // Fetch formation requests with votes
    const formationRequests = await prisma.formationRequest.findMany({
      include: {
        votes: {
          include: {
            user: {
              select: {
                email: true,
                displayName: true
              }
            }
          }
        },
        _count: {
          select: {
            votes: true
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
      'Group Leader',
      'Leader Email',
      'Cell Phone',
      'Description',
      'Group Type',
      'Ages/Stages',
      'Meeting Frequency',
      'Day of Week',
      'Meeting Time',
      'Status',
      'Approval Votes',
      'Object Votes',
      'Discuss Votes',
      'Pass Votes',
      'Total Votes',
      'Auto Approval Scheduled',
      'Submitted Date',
      'Updated Date'
    ].join(',')

    const csvRows = formationRequests.map(request => {
      const approvalVotes = request.votes.filter(v => v.vote === 'APPROVE').length
      const objectVotes = request.votes.filter(v => v.vote === 'OBJECT').length
      const discussVotes = request.votes.filter(v => v.vote === 'DISCUSS').length
      const passVotes = request.votes.filter(v => v.vote === 'PASS').length

      return [
        request.id,
        `"${(request.title || '').replace(/"/g, '""')}"`,
        `"${(request.groupLeader || '').replace(/"/g, '""')}"`,
        `"${(request.leaderEmail || '').replace(/"/g, '""')}"`,
        `"${(request.cellPhone || '').replace(/"/g, '""')}"`,
        `"${(request.description || '').replace(/"/g, '""')}"`,
        request.groupType || '',
        `"${(Array.isArray(request.agesStages) ? request.agesStages.join(', ') : request.agesStages || '').replace(/"/g, '""')}"`,
        request.meetingFrequency || '',
        request.dayOfWeek || '',
        `"${(request.meetingTime || '').replace(/"/g, '""')}"`,
        request.status,
        approvalVotes,
        objectVotes,
        discussVotes,
        passVotes,
        request._count.votes,
        request.autoApprovalScheduled?.toISOString() || '',
        request.createdAt.toISOString(),
        request.updatedAt.toISOString()
      ].join(',')
    })

    const csvContent = [csvHeaders, ...csvRows].join('\n')

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="formation-requests-export.csv"',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Formation requests export error:', error)
    return createErrorResponse('Export failed', 500)
  }
}