import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
  withAuth,
  withValidation
} from '@/lib/api-utils'
import { voteOnFormationRequestSchema } from '@/lib/validations'
import { VoteType, FormationStatus, UserRole } from '@prisma/client'
import { canAutoApprove, processFormationApproval } from '@/lib/formation-workflow'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/formation-requests/[id]/vote - Vote on formation request
export async function POST(req: NextRequest, context: RouteParams) {
  return withAuth(async (req: NextRequest, session: any) => {
    return withValidation(
      voteOnFormationRequestSchema,
      async (req: NextRequest, validatedData: any) => {
        try {
          const { params } = context
          const { id } = await params
          const { vote, comment } = validatedData

          const formationRequest = await prisma.formationRequest.findUnique({
            where: { id },
            select: { id: true, status: true },
          })

          if (!formationRequest) {
            return createErrorResponse('Formation request not found', 404)
          }

          if (formationRequest.status !== FormationStatus.SUBMITTED) {
            return createErrorResponse('Cannot vote on this formation request', 400)
          }

          const updatedVote = await prisma.formationVote.upsert({
            where: {
              requestId_userId: {
                requestId: id,
                userId: session.user.id
              }
            },
            update: {
              vote: vote as VoteType,
              comment: comment || null,
            },
            create: {
              requestId: id,
              userId: session.user.id,
              vote: vote as VoteType,
              comment: comment || null,
            },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                }
              }
            }
          })

          // A vote never approves or rejects on its own. This only takes effect
          // for a request whose review window has already closed; anything
          // still inside the window is picked up by the scheduled sweep.
          // Objections and requests to discuss simply hold it open for the team.
          const outcome = await processFormationApproval(id)
          const assessment = await canAutoApprove(id)

          return createSuccessResponse(
            {
              vote: updatedVote,
              approved: outcome.approved,
              status: assessment,
            },
            outcome.approved
              ? 'Vote recorded — this request met every condition and has been approved'
              : `Vote recorded. ${assessment.reason}`
          )
        } catch (error) {
          console.error('Error recording vote:', error)
          return createErrorResponse('Failed to record vote', 500)
        }
      }
    )(req)
  }, [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN])(req)
}
