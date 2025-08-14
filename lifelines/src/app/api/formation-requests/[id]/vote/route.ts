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
import { sendWelcomeEmail } from '@/lib/email'
import { hashPassword } from '@/lib/auth-utils'

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

          // Check if formation request exists
          const formationRequest = await prisma.formationRequest.findUnique({
            where: { id },
            include: {
              votes: {
                include: {
                  user: true
                }
              }
            }
          })

          if (!formationRequest) {
            return createErrorResponse('Formation request not found', 404)
          }

          if (formationRequest.status !== FormationStatus.SUBMITTED) {
            return createErrorResponse('Cannot vote on this formation request', 400)
          }

          // Upsert the vote
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

    // Check if auto-approval conditions are met
    const allVotes = await prisma.formationVote.findMany({
      where: { requestId: id },
      include: {
        user: true
      }
    })

    const approveVotes = allVotes.filter(v => v.vote === VoteType.APPROVE).length
    const objectVotes = allVotes.filter(v => v.vote === VoteType.OBJECT).length
    const hasDiscussVotes = allVotes.some(v => v.vote === VoteType.DISCUSS)

    // Auto-approve if: 2+ approvals, no objections, no discuss votes
    const shouldAutoApprove = approveVotes >= 2 && objectVotes === 0 && !hasDiscussVotes

    if (shouldAutoApprove) {
      await approveFormationRequest(formationRequest)
    }
    // Auto-reject if any objections
    else if (objectVotes > 0) {
      await prisma.formationRequest.update({
        where: { id },
        data: { status: FormationStatus.REJECTED }
      })
    }

          return createSuccessResponse(updatedVote, 'Vote recorded successfully')
        } catch (error) {
          console.error('Error recording vote:', error)
          return createErrorResponse('Failed to record vote', 500)
        }
      }
    )(req)
  }, [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN])(req)
}

// Helper function to approve formation request and create LifeLine
async function approveFormationRequest(formationRequest: any) {
  try {
    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8)
    const hashedPassword = await hashPassword(tempPassword)

    // Create or update user account for the leader
    const leader = await prisma.user.upsert({
      where: { email: formationRequest.leaderEmail },
      update: {
        displayName: formationRequest.groupLeader,
        role: UserRole.LIFELINE_LEADER,
        isActive: true,
      },
      create: {
        email: formationRequest.leaderEmail,
        password: hashedPassword,
        displayName: formationRequest.groupLeader,
        role: UserRole.LIFELINE_LEADER,
        isActive: true,
      }
    })

    // Create the LifeLine
    const lifeLine = await prisma.lifeLine.create({
      data: {
        title: formationRequest.title,
        description: formationRequest.description,
        groupLeader: formationRequest.groupLeader,
        leaderEmail: formationRequest.leaderEmail,
        agesStages: formationRequest.agesStages ? [formationRequest.agesStages] : [],
        meetingFrequency: formationRequest.meetingFrequency,
        dayOfWeek: formationRequest.dayOfWeek,
        groupType: formationRequest.groupType,
        meetingTime: formationRequest.meetingTime,
        status: 'DRAFT', // Start as draft so leader can customize
        leaderId: leader.id,
        formationRequestId: formationRequest.id,
      }
    })

    // Update formation request status
    await prisma.formationRequest.update({
      where: { id: formationRequest.id },
      data: { 
        status: FormationStatus.APPROVED,
        lifeLineCreated: true,
      }
    })

    // Send welcome email to new leader
    try {
      await sendWelcomeEmail(
        leader.email,
        leader.displayName || leader.email,
        tempPassword,
        lifeLine.title
      )
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
    }

    return lifeLine
  } catch (error) {
    console.error('Error approving formation request:', error)
    throw error
  }
}