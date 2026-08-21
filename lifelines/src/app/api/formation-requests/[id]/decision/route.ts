import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse, withAuth } from '@/lib/api-utils'
import { FormationStatus, UserRole } from '@prisma/client'
import { approveFormationRequest, rejectFormationRequest } from '@/lib/formation-workflow'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const decisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  // Shown to the person who asked, so it is required when turning them down.
  reason: z.string().trim().max(2000).optional(),
})

/**
 * POST /api/formation-requests/[id]/decision
 *
 * An admin's final call on a request — the override for anything the vote
 * cannot settle: an objection that has been talked through, a group that needs
 * to start sooner than the review window allows, or one that should not go
 * ahead. Uses the same workflow as automatic approval, so a manually approved
 * request produces exactly the same LifeLine, account, and email.
 */
export async function POST(req: NextRequest, context: RouteParams) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const { params } = context
      const { id } = await params

      const body = await req.json().catch(() => ({}))
      const parsed = decisionSchema.safeParse(body)
      if (!parsed.success) {
        return createErrorResponse('Choose either approve or reject', 400)
      }

      const { decision, reason } = parsed.data

      const formationRequest = await prisma.formationRequest.findUnique({
        where: { id },
        select: { id: true, status: true, lifeLineCreated: true },
      })

      if (!formationRequest) {
        return createErrorResponse('Formation request not found', 404)
      }

      if (formationRequest.status !== FormationStatus.SUBMITTED) {
        return createErrorResponse(
          `This request is already ${formationRequest.status.toLowerCase()}`,
          400
        )
      }

      if (decision === 'REJECT') {
        if (!reason) {
          return createErrorResponse('Please give a reason — it is sent to the person who asked', 400)
        }

        await rejectFormationRequest(id, reason)
        return createSuccessResponse(
          { status: FormationStatus.REJECTED },
          'Request declined and the requester has been notified'
        )
      }

      const { lifeLine } = await approveFormationRequest(id)
      return createSuccessResponse(
        { status: FormationStatus.APPROVED, lifeLineId: lifeLine.id },
        'Approved — the LifeLine has been created as a draft and the leader has been emailed'
      )
    } catch (error) {
      console.error('Error deciding formation request:', error)
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to record the decision',
        500
      )
    }
  }, [UserRole.ADMIN])(req)
}
