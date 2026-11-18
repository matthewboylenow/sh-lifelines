import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { hasAnyRole } from '@/lib/auth-utils'
import { InquiryStatus, InquirySource, UserRole } from '@prisma/client'

const addMemberSchema = z.object({
  personName: z.string().trim().min(2, 'Enter the person’s name'),
  personEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('That email address doesn’t look right')
    .optional()
    .or(z.literal('')),
  personPhone: z.string().trim().max(40).optional().or(z.literal('')),
  note: z.string().trim().max(2000).optional().or(z.literal('')),
})

/**
 * POST /api/lifelines/[id]/members - Add someone to a group directly.
 *
 * For the people who already belong but never filled in the join form:
 * existing members of a legacy group, someone who joined at the door. They go
 * straight in as joined, and no join-request email is sent, since the leader
 * is the one adding them. The group's leaders and staff may do this.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const { id } = await params
    const lifeLine = await prisma.lifeLine.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        leaders: { select: { id: true } },
        _count: { select: { children: true } },
      },
    })
    if (!lifeLine) {
      return createErrorResponse('LifeLine not found', 404)
    }

    const isStaff = hasAnyRole(session.user.roles, [UserRole.ADMIN, UserRole.FORMATION_SUPPORT_TEAM])
    const leadsIt = lifeLine.leaders.some(leader => leader.id === session.user.id)
    if (!isStaff && !leadsIt) {
      return createErrorResponse('You can only add members to groups you lead', 403)
    }

    // A family heading has no members of its own; people belong to one of the
    // times beneath it.
    if (lifeLine._count.children > 0) {
      return createErrorResponse('Add them to one of the groups under this LifeLine instead', 400)
    }

    const parsed = addMemberSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0]?.message || 'Please check the form', 400)
    }
    const personName = parsed.data.personName
    const personEmail = parsed.data.personEmail || null
    const personPhone = parsed.data.personPhone || null
    const note = parsed.data.note || null

    // The same person twice would mean two rows, two emails from the leader,
    // and a member count that's wrong. Match on email where there is one,
    // otherwise on the name.
    const existing = await prisma.inquiry.findFirst({
      where: {
        lifeLineId: lifeLine.id,
        ...(personEmail
          ? { personEmail: { equals: personEmail, mode: 'insensitive' } }
          : { personName: { equals: personName, mode: 'insensitive' } }),
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existing?.status === InquiryStatus.JOINED) {
      return createErrorResponse(`${existing.personName} is already a member of ${lifeLine.title}`, 409)
    }

    const now = new Date()
    const member = existing
      ? // Someone who left, was removed, or asked and never joined: bring the
        // same record back rather than starting a second one.
        await prisma.inquiry.update({
          where: { id: existing.id },
          data: {
            status: InquiryStatus.JOINED,
            joinedAt: now,
            personName,
            ...(personEmail && { personEmail }),
            ...(personPhone && { personPhone }),
            ...(note && { leaderNotes: note }),
            removedAt: null,
            removedReason: null,
            removedById: null,
            notJoinedReason: null,
          },
        })
      : await prisma.inquiry.create({
          data: {
            lifeLineId: lifeLine.id,
            personName,
            personEmail,
            personPhone,
            leaderNotes: note,
            status: InquiryStatus.JOINED,
            source: InquirySource.DIRECT_REFERRAL,
            joinedAt: now,
          },
        })

    return createSuccessResponse(
      member,
      existing ? `${personName} is back in ${lifeLine.title}` : `${personName} added to ${lifeLine.title}`
    )
  } catch (error) {
    console.error('Error adding member:', error)
    return createErrorResponse('Failed to add member', 500)
  }
}
