import { prisma } from './prisma'
import { sendWelcomeEmail, sendFormationRequestRejectionEmail } from './email'
import { FormationStatus, VoteType, UserRole, LifeLineStatus } from '@prisma/client'
import { hashPassword } from './auth-utils'

// Formation request auto-approval logic
export async function processFormationApproval(requestId: string) {
  try {
    const formationRequest = await prisma.formationRequest.findUnique({
      where: { id: requestId },
      include: {
        votes: {
          include: {
            user: true
          }
        },
        comments: {
          include: {
            author: true
          }
        }
      }
    })

    if (!formationRequest) {
      throw new Error('Formation request not found')
    }

    if (formationRequest.status !== FormationStatus.SUBMITTED) {
      return { approved: false, reason: 'Request is not in submitted status' }
    }

    // Check voting status
    const votes = formationRequest.votes
    const approveVotes = votes.filter(v => v.vote === VoteType.APPROVE).length
    const objectVotes = votes.filter(v => v.vote === VoteType.OBJECT).length
    const discussVotes = votes.filter(v => v.vote === VoteType.DISCUSS).length
    
    // Auto-approval criteria:
    // 1. At least 2 approval votes
    // 2. No objection votes
    // 3. No discussion votes (or discussion votes are resolved)
    // 4. Request has been submitted for at least 24 hours (for review period)
    
    const isOldEnough = new Date(Date.now() - 24 * 60 * 60 * 1000) > formationRequest.createdAt
    const meetsVotingCriteria = approveVotes >= 2 && objectVotes === 0 && discussVotes === 0
    
    if (!isOldEnough) {
      return { approved: false, reason: 'Request needs more review time' }
    }
    
    if (!meetsVotingCriteria) {
      return { 
        approved: false, 
        reason: `Voting criteria not met: ${approveVotes} approvals, ${objectVotes} objections, ${discussVotes} discussions` 
      }
    }

    // Auto-approve the request
    await approveFormationRequest(requestId)
    
    return { approved: true, reason: 'Auto-approved based on voting criteria' }
    
  } catch (error) {
    console.error('Error processing formation approval:', error)
    throw error
  }
}

// Approve formation request and create LifeLine + User account
export async function approveFormationRequest(requestId: string) {
  const formationRequest = await prisma.formationRequest.findUnique({
    where: { id: requestId }
  })
  
  if (!formationRequest) {
    throw new Error('Formation request not found')
  }

  if (formationRequest.lifeLineCreated) {
    throw new Error('LifeLine already created for this request')
  }

  // Generate temporary password for new leader
  const tempPassword = generateTempPassword()
  const hashedPassword = await hashPassword(tempPassword)

  // Check if user already exists
  let leader = await prisma.user.findUnique({
    where: { email: formationRequest.leaderEmail }
  })

  if (!leader) {
    // Create new user account
    leader = await prisma.user.create({
      data: {
        email: formationRequest.leaderEmail,
        password: hashedPassword,
        displayName: formationRequest.groupLeader,
        role: UserRole.LIFELINE_LEADER,
        isActive: true,
      }
    })
  }

  // Create LifeLine
  const lifeLine = await prisma.lifeLine.create({
    data: {
      title: formationRequest.title,
      description: formationRequest.description,
      status: LifeLineStatus.DRAFT,
      groupLeader: formationRequest.groupLeader,
      leaderEmail: formationRequest.leaderEmail,
      agesStages: formationRequest.agesStages ? [formationRequest.agesStages] : [],
      meetingFrequency: formationRequest.meetingFrequency,
      dayOfWeek: formationRequest.dayOfWeek,
      groupType: formationRequest.groupType,
      meetingTime: formationRequest.meetingTime,
      leaderId: leader.id,
      formationRequestId: requestId,
    }
  })

  // Update formation request
  await prisma.formationRequest.update({
    where: { id: requestId },
    data: {
      status: FormationStatus.APPROVED,
      lifeLineCreated: true,
    }
  })

  // Send welcome email to new leader
  try {
    await sendWelcomeEmail(
      formationRequest.leaderEmail,
      formationRequest.groupLeader,
      tempPassword,
      formationRequest.title
    )
    console.log('Welcome email sent to new leader:', formationRequest.leaderEmail)
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    // Don't fail the whole process if email fails
  }

  return {
    lifeLine,
    leader,
    tempPassword // Only for logging/debugging - don't expose this in API responses
  }
}

// Reject formation request
export async function rejectFormationRequest(requestId: string, reason?: string) {
  const formationRequest = await prisma.formationRequest.findUnique({
    where: { id: requestId }
  })
  
  if (!formationRequest) {
    throw new Error('Formation request not found')
  }

  await prisma.formationRequest.update({
    where: { id: requestId },
    data: {
      status: FormationStatus.REJECTED,
    }
  })

  // Send rejection email to requester
  try {
    await sendFormationRequestRejectionEmail(
      {
        groupLeader: formationRequest.groupLeader,
        leaderEmail: formationRequest.leaderEmail,
        title: formationRequest.title
      },
      reason
    )
    console.log('Rejection email sent to:', formationRequest.leaderEmail)
  } catch (error) {
    console.error('Failed to send rejection email:', error)
    // Don't fail the whole process if email fails
  }

  console.log(`Formation request ${requestId} rejected. Reason: ${reason}`)
}

// Check all submitted formation requests for auto-approval
export async function processAllPendingFormationRequests() {
  const pendingRequests = await prisma.formationRequest.findMany({
    where: {
      status: FormationStatus.SUBMITTED,
      lifeLineCreated: false,
    }
  })

  const results = []
  
  for (const request of pendingRequests) {
    try {
      const result = await processFormationApproval(request.id)
      results.push({
        requestId: request.id,
        title: request.title,
        ...result
      })
    } catch (error) {
      console.error(`Error processing request ${request.id}:`, error)
      results.push({
        requestId: request.id,
        title: request.title,
        approved: false,
        reason: 'Processing error'
      })
    }
  }

  return results
}

// Generate temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Check if formation request can be auto-approved (helper function)
export async function canAutoApprove(requestId: string): Promise<{
  canApprove: boolean
  reason: string
  votingSummary: {
    approvals: number
    objections: number
    discussions: number
    passes: number
    total: number
  }
}> {
  const formationRequest = await prisma.formationRequest.findUnique({
    where: { id: requestId },
    include: {
      votes: true
    }
  })

  if (!formationRequest) {
    return {
      canApprove: false,
      reason: 'Formation request not found',
      votingSummary: { approvals: 0, objections: 0, discussions: 0, passes: 0, total: 0 }
    }
  }

  const votes = formationRequest.votes
  const approvals = votes.filter(v => v.vote === VoteType.APPROVE).length
  const objections = votes.filter(v => v.vote === VoteType.OBJECT).length
  const discussions = votes.filter(v => v.vote === VoteType.DISCUSS).length
  const passes = votes.filter(v => v.vote === VoteType.PASS).length

  const votingSummary = {
    approvals,
    objections,
    discussions,
    passes,
    total: votes.length
  }

  const isOldEnough = new Date(Date.now() - 24 * 60 * 60 * 1000) > formationRequest.createdAt
  const meetsVotingCriteria = approvals >= 2 && objections === 0 && discussions === 0

  if (!isOldEnough) {
    return {
      canApprove: false,
      reason: 'Request needs more review time (minimum 24 hours)',
      votingSummary
    }
  }

  if (!meetsVotingCriteria) {
    let reason = 'Voting criteria not met: '
    const criteria = []
    if (approvals < 2) criteria.push(`need ${2 - approvals} more approvals`)
    if (objections > 0) criteria.push(`has ${objections} objections`)
    if (discussions > 0) criteria.push(`has ${discussions} discussions pending`)
    reason += criteria.join(', ')

    return {
      canApprove: false,
      reason,
      votingSummary
    }
  }

  return {
    canApprove: true,
    reason: 'All criteria met for auto-approval',
    votingSummary
  }
}