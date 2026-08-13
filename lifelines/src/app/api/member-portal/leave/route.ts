import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { sendMemberLeftNotification } from '@/lib/email'
import { LEAVE_REASONS, verifyPortalToken } from '@/lib/member-portal'
import { z } from 'zod'

const schema = z.object({
  token: z.string(),
  inquiryId: z.string(),
  reason: z.enum(LEAVE_REASONS),
  notes: z.string().max(2000).optional(),
})

// POST /api/member-portal/leave - A member steps away from one of their LifeLines
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse(
        `Please choose a reason: ${parsed.error.issues[0]?.message || 'invalid request'}`,
        400
      )
    }

    const { token, inquiryId, reason, notes } = parsed.data

    const session = await verifyPortalToken(token)
    if (!session) {
      return createErrorResponse('This link is invalid or has expired', 401)
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      select: {
        id: true,
        personName: true,
        personEmail: true,
        status: true,
        lifeLine: {
          select: {
            title: true,
            groupLeader: true,
            leaders: { select: { displayName: true, email: true } },
          },
        },
      },
    })

    if (!inquiry) {
      return createErrorResponse('That LifeLine could not be found', 404)
    }

    // The token proves control of an email address, so it may only act on
    // records belonging to that address.
    if ((inquiry.personEmail || '').toLowerCase() !== session.email) {
      return createErrorResponse('This link is invalid or has expired', 401)
    }

    if (!['JOINED', 'UNDECIDED'].includes(inquiry.status)) {
      return createSuccessResponse(
        { alreadyLeft: true },
        'You have already been removed from this LifeLine'
      )
    }

    // LEFT is distinct from REMOVED: it records that the member chose to step
    // away, rather than a leader removing them. removedById stays null for the
    // same reason.
    const trimmedNotes = notes?.trim() || null
    await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: {
        status: 'LEFT',
        removedReason: trimmedNotes ? `${reason} — ${trimmedNotes}` : reason,
        removedAt: new Date(),
      },
    })

    // Tell the leader, but never fail the member's request over email trouble.
    const leaderEmail = inquiry.lifeLine.leaders?.[0]?.email
    if (leaderEmail) {
      try {
        await sendMemberLeftNotification(
          leaderEmail,
          inquiry.lifeLine.leaders?.[0]?.displayName || inquiry.lifeLine.groupLeader || 'LifeLine Leader',
          {
            personName: inquiry.personName,
            personEmail: inquiry.personEmail,
            lifeLineTitle: inquiry.lifeLine.title,
            reason,
            notes: trimmedNotes,
          }
        )
      } catch (emailError) {
        console.error('Failed to notify leader of member departure:', emailError)
      }
    }

    return createSuccessResponse(
      { left: true, lifeLineTitle: inquiry.lifeLine.title },
      `You have left ${inquiry.lifeLine.title}`
    )
  } catch (error) {
    console.error('Error leaving LifeLine:', error)
    return createErrorResponse('Something went wrong. Please try again.', 500)
  }
}
