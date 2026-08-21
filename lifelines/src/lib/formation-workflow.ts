import { prisma } from './prisma'
import { sendWelcomeEmail, sendFormationRequestRejectionEmail } from './email'
import { FormationStatus, VoteType, UserRole, LifeLineStatus } from '@prisma/client'
import { hashPassword } from './auth-utils'
import { slugify } from './utils'
import crypto from 'crypto'

/**
 * How the formation workflow decides.
 *
 * A request needs two approvals and a quiet review window before it becomes a
 * LifeLine. An objection or a request to discuss does NOT reject anything on
 * its own — it holds the request open so the team can talk it through, and an
 * admin makes the final call from the dashboard.
 *
 * Every path that creates a LifeLine or rejects a request goes through this
 * file, so the rules only exist in one place.
 */

/** Approvals needed before a request can go through. */
export const REQUIRED_APPROVALS = 2

/** How long a request rests before approval can take effect. */
export const REVIEW_PERIOD_HOURS = 48

/**
 * When the review window closes. Requests carry their own deadline; older ones
 * that predate that field fall back to the standard window after submission.
 */
function reviewEndsAt(request: { createdAt: Date; autoApprovalScheduled: Date | null }) {
  return (
    request.autoApprovalScheduled ??
    new Date(request.createdAt.getTime() + REVIEW_PERIOD_HOURS * 60 * 60 * 1000)
  )
}

export interface VotingSummary {
  approvals: number
  objections: number
  discussions: number
  passes: number
  total: number
}

export interface ApprovalAssessment {
  canApprove: boolean
  /** Set when something needs a person rather than more time. */
  needsAttention: boolean
  reason: string
  reviewEndsAt: Date | null
  votingSummary: VotingSummary
}

const emptySummary: VotingSummary = {
  approvals: 0,
  objections: 0,
  discussions: 0,
  passes: 0,
  total: 0,
}

function summarise(votes: { vote: VoteType }[]): VotingSummary {
  return {
    approvals: votes.filter(v => v.vote === VoteType.APPROVE).length,
    objections: votes.filter(v => v.vote === VoteType.OBJECT).length,
    discussions: votes.filter(v => v.vote === VoteType.DISCUSS).length,
    passes: votes.filter(v => v.vote === VoteType.PASS).length,
    total: votes.length,
  }
}

/**
 * Read-only view of where a request stands. Used by the dashboard, the cron
 * monitor, and the auto-approval path itself so they can never disagree.
 */
export async function canAutoApprove(requestId: string): Promise<ApprovalAssessment> {
  const formationRequest = await prisma.formationRequest.findUnique({
    where: { id: requestId },
    include: { votes: { select: { vote: true } } },
  })

  if (!formationRequest) {
    return {
      canApprove: false,
      needsAttention: false,
      reason: 'Formation request not found',
      reviewEndsAt: null,
      votingSummary: emptySummary,
    }
  }

  const votingSummary = summarise(formationRequest.votes)
  const endsAt = reviewEndsAt(formationRequest)

  const assess = (canApprove: boolean, needsAttention: boolean, reason: string) => ({
    canApprove,
    needsAttention,
    reason,
    reviewEndsAt: endsAt,
    votingSummary,
  })

  if (formationRequest.status !== FormationStatus.SUBMITTED) {
    return assess(false, false, `Request is ${formationRequest.status.toLowerCase()}`)
  }

  if (formationRequest.lifeLineCreated) {
    return assess(false, false, 'A LifeLine has already been created for this request')
  }

  // Concerns hold the request open for the team; they never reject it outright.
  if (votingSummary.objections > 0) {
    return assess(
      false,
      true,
      `On hold: ${votingSummary.objections} objection${votingSummary.objections === 1 ? '' : 's'} to work through`
    )
  }

  if (votingSummary.discussions > 0) {
    return assess(
      false,
      true,
      `On hold: ${votingSummary.discussions} member${votingSummary.discussions === 1 ? '' : 's'} asked to discuss this`
    )
  }

  if (votingSummary.approvals < REQUIRED_APPROVALS) {
    const needed = REQUIRED_APPROVALS - votingSummary.approvals
    return assess(false, false, `Waiting on ${needed} more approval${needed === 1 ? '' : 's'}`)
  }

  if (new Date() < endsAt) {
    return assess(false, false, `Approved, pending the ${REVIEW_PERIOD_HOURS}-hour review window`)
  }

  return assess(true, false, 'Ready to approve')
}

/**
 * Approve the request if it has met every condition. Safe to call repeatedly —
 * it only acts when the criteria are genuinely satisfied.
 */
export async function processFormationApproval(requestId: string) {
  const assessment = await canAutoApprove(requestId)

  if (!assessment.canApprove) {
    return { approved: false, reason: assessment.reason }
  }

  await approveFormationRequest(requestId)
  return { approved: true, reason: 'Approved: two approvals and the review window has passed' }
}

/**
 * Create the leader's account and their LifeLine. This is the only place a
 * formation request turns into a real group.
 */
export async function approveFormationRequest(requestId: string) {
  const formationRequest = await prisma.formationRequest.findUnique({
    where: { id: requestId },
  })

  if (!formationRequest) {
    throw new Error('Formation request not found')
  }

  if (formationRequest.lifeLineCreated) {
    throw new Error('LifeLine already created for this request')
  }

  const email = formationRequest.leaderEmail.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })

  // Only new accounts get a temporary password; an existing leader keeps theirs.
  let tempPassword: string | null = null
  let leader = existing

  if (leader) {
    // Leading a group is an added role, never a replacement — an admin or
    // formation team member who starts a LifeLine keeps everything they had.
    if (!leader.roles.includes(UserRole.LIFELINE_LEADER)) {
      leader = await prisma.user.update({
        where: { id: leader.id },
        data: { roles: [...leader.roles, UserRole.LIFELINE_LEADER] },
      })
    }
  } else {
    tempPassword = generateTempPassword()
    leader = await prisma.user.create({
      data: {
        email,
        password: await hashPassword(tempPassword),
        displayName: formationRequest.groupLeader,
        roles: [UserRole.LIFELINE_LEADER],
        isActive: true,
      },
    })
  }

  const lifeLine = await prisma.lifeLine.create({
    data: {
      title: formationRequest.title,
      slug: await uniqueSlug(formationRequest.title),
      description: formationRequest.description,
      status: LifeLineStatus.DRAFT,
      groupLeader: formationRequest.groupLeader,
      leaderEmail: email,
      agesStages: formationRequest.agesStages ? [formationRequest.agesStages] : [],
      meetingFrequency: formationRequest.meetingFrequency,
      dayOfWeek: formationRequest.dayOfWeek,
      groupType: formationRequest.groupType,
      meetingTime: formationRequest.meetingTime,
      leaders: { connect: [{ id: leader.id }] },
      formationRequestId: requestId,
    },
  })

  await prisma.formationRequest.update({
    where: { id: requestId },
    data: {
      status: FormationStatus.APPROVED,
      lifeLineCreated: true,
    },
  })

  // A failed email should not undo an approval that already happened.
  try {
    await sendWelcomeEmail(
      email,
      formationRequest.groupLeader,
      tempPassword,
      formationRequest.title
    )
  } catch (error) {
    console.error('Failed to send welcome email:', error)
  }

  return { lifeLine, leader, tempPassword }
}

/** Reject a request and tell the person who asked. */
export async function rejectFormationRequest(requestId: string, reason?: string) {
  const formationRequest = await prisma.formationRequest.findUnique({
    where: { id: requestId },
  })

  if (!formationRequest) {
    throw new Error('Formation request not found')
  }

  if (formationRequest.lifeLineCreated) {
    throw new Error('This request has already become a LifeLine and cannot be rejected')
  }

  await prisma.formationRequest.update({
    where: { id: requestId },
    data: { status: FormationStatus.REJECTED },
  })

  try {
    await sendFormationRequestRejectionEmail(
      {
        groupLeader: formationRequest.groupLeader,
        leaderEmail: formationRequest.leaderEmail,
        title: formationRequest.title,
      },
      reason
    )
  } catch (error) {
    console.error('Failed to send rejection email:', error)
  }

  return { rejected: true }
}

/** Sweep every open request — run on a schedule so review windows close on time. */
export async function processAllPendingFormationRequests() {
  const pendingRequests = await prisma.formationRequest.findMany({
    where: {
      status: FormationStatus.SUBMITTED,
      lifeLineCreated: false,
    },
    select: { id: true, title: true },
  })

  const results = []

  for (const request of pendingRequests) {
    try {
      const result = await processFormationApproval(request.id)
      results.push({ requestId: request.id, title: request.title, ...result })
    } catch (error) {
      console.error(`Error processing request ${request.id}:`, error)
      results.push({
        requestId: request.id,
        title: request.title,
        approved: false,
        reason: 'Processing error',
      })
    }
  }

  return results
}

/** A readable, unique URL for the new group, matching the manual create path. */
async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'lifeline'
  let slug = base
  let counter = 1

  while (await prisma.lifeLine.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${counter}`
    counter += 1
  }

  return slug
}

/** Temporary password for a brand new leader account. */
function generateTempPassword(): string {
  // No look-alike characters — these get read aloud and retyped.
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(14)
  let password = ''
  for (let i = 0; i < 14; i++) {
    password += chars.charAt(bytes[i] % chars.length)
  }
  return password
}
