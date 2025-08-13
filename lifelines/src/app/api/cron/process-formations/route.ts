import { NextRequest } from 'next/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { processAllPendingFormationRequests } from '@/lib/formation-workflow'

// POST /api/cron/process-formations - Process all pending formation requests
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = req.headers.get('x-cron-secret')
    if (cronSecret !== process.env.CRON_SECRET) {
      return createErrorResponse('Unauthorized', 401)
    }

    console.log('Processing pending formation requests...')
    const results = await processAllPendingFormationRequests()
    
    const processedCount = results.length
    const approvedCount = results.filter(r => r.approved).length
    const rejectedCount = results.filter(r => !r.approved).length

    console.log(`Processed ${processedCount} formation requests: ${approvedCount} approved, ${rejectedCount} rejected`)

    return createSuccessResponse({
      processed: processedCount,
      approved: approvedCount,
      rejected: rejectedCount,
      results: results
    }, `Processed ${processedCount} formation requests`)

  } catch (error) {
    console.error('Error processing formation requests:', error)
    return createErrorResponse('Failed to process formation requests', 500)
  }
}

// GET /api/cron/process-formations - Get status of pending formation requests (for monitoring)
export async function GET(req: NextRequest) {
  try {
    // Basic auth check - could be enhanced
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized', 401)
    }

    // This endpoint provides visibility into pending requests without processing them
    const { prisma } = await import('@/lib/prisma')
    const { canAutoApprove } = await import('@/lib/formation-workflow')
    
    const pendingRequests = await prisma.formationRequest.findMany({
      where: {
        status: 'SUBMITTED',
        lifeLineCreated: false,
      },
      select: {
        id: true,
        title: true,
        groupLeader: true,
        leaderEmail: true,
        createdAt: true,
        _count: {
          select: {
            votes: true,
            comments: true
          }
        }
      }
    })

    const requestStatuses = await Promise.all(
      pendingRequests.map(async (request) => {
        const approval = await canAutoApprove(request.id)
        return {
          id: request.id,
          title: request.title,
          leader: request.groupLeader,
          email: request.leaderEmail,
          createdAt: request.createdAt,
          votesCount: request._count.votes,
          commentsCount: request._count.comments,
          canAutoApprove: approval.canApprove,
          reason: approval.reason,
          votingSummary: approval.votingSummary
        }
      })
    )

    return createSuccessResponse({
      pendingCount: pendingRequests.length,
      readyForApproval: requestStatuses.filter(r => r.canAutoApprove).length,
      requests: requestStatuses
    })

  } catch (error) {
    console.error('Error getting formation status:', error)
    return createErrorResponse('Failed to get formation status', 500)
  }
}