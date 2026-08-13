import { NextRequest } from 'next/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { processAllPendingFormationRequests, canAutoApprove } from '@/lib/formation-workflow'
import { prisma } from '@/lib/prisma'

/**
 * Closes review windows on schedule.
 *
 * Vercel invokes cron paths with a GET and, when CRON_SECRET is configured,
 * sends it as `Authorization: Bearer <CRON_SECRET>`. Both verbs are handled so
 * the job can also be triggered by hand.
 */

function isAuthorisedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  // Without a configured secret there is nothing to check against, so refuse
  // rather than leave the job open to anyone.
  if (!secret) return false

  const header = req.headers.get('authorization')
  if (header === `Bearer ${secret}`) return true

  return req.headers.get('x-cron-secret') === secret
}

async function run() {
  const results = await processAllPendingFormationRequests()
  const approved = results.filter(r => r.approved)

  console.log(
    `Processed ${results.length} formation requests: ${approved.length} approved, ${results.length - approved.length} still open`
  )

  return createSuccessResponse(
    {
      processed: results.length,
      approved: approved.length,
      stillOpen: results.length - approved.length,
      results,
    },
    `Processed ${results.length} formation requests`
  )
}

// GET - how Vercel Cron invokes this. Add ?dryRun=1 to inspect without acting.
export async function GET(req: NextRequest) {
  try {
    if (!process.env.CRON_SECRET) {
      console.error('CRON_SECRET is not configured — formation requests will never auto-approve')
      return createErrorResponse('Scheduled processing is not configured', 503)
    }

    if (!isAuthorisedCron(req)) {
      return createErrorResponse('Unauthorized', 401)
    }

    const dryRun = new URL(req.url).searchParams.get('dryRun')
    if (!dryRun) {
      return await run()
    }

    const pendingRequests = await prisma.formationRequest.findMany({
      where: { status: 'SUBMITTED', lifeLineCreated: false },
      select: {
        id: true,
        title: true,
        groupLeader: true,
        createdAt: true,
        _count: { select: { votes: true, comments: true } },
      },
    })

    const requests = await Promise.all(
      pendingRequests.map(async request => {
        const approval = await canAutoApprove(request.id)
        return {
          id: request.id,
          title: request.title,
          leader: request.groupLeader,
          createdAt: request.createdAt,
          votesCount: request._count.votes,
          commentsCount: request._count.comments,
          canAutoApprove: approval.canApprove,
          needsAttention: approval.needsAttention,
          reason: approval.reason,
          reviewEndsAt: approval.reviewEndsAt,
          votingSummary: approval.votingSummary,
        }
      })
    )

    return createSuccessResponse({
      pendingCount: requests.length,
      readyForApproval: requests.filter(r => r.canAutoApprove).length,
      needingAttention: requests.filter(r => r.needsAttention).length,
      requests,
    })
  } catch (error) {
    console.error('Error processing formation requests:', error)
    return createErrorResponse('Failed to process formation requests', 500)
  }
}

// POST - manual trigger with the same secret.
export async function POST(req: NextRequest) {
  try {
    if (!process.env.CRON_SECRET) {
      return createErrorResponse('Scheduled processing is not configured', 503)
    }
    if (!isAuthorisedCron(req)) {
      return createErrorResponse('Unauthorized', 401)
    }
    return await run()
  } catch (error) {
    console.error('Error processing formation requests:', error)
    return createErrorResponse('Failed to process formation requests', 500)
  }
}
