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
 *
 * Send { members: [...] } instead to add a whole list from a spreadsheet;
 * the reply says how many were added, brought back, already there or skipped.
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

    const body = await req.json().catch(() => ({}))

    // A spreadsheet upload sends { members: [...] }; the form sends one person.
    if (Array.isArray(body?.members)) {
      if (body.members.length === 0) {
        return createErrorResponse('There was no one to add', 400)
      }
      if (body.members.length > MAX_PER_UPLOAD) {
        return createErrorResponse(`Upload at most ${MAX_PER_UPLOAD} people at a time`, 400)
      }

      const summary = { added: 0, rejoined: 0, alreadyMembers: [] as string[], skipped: [] as string[] }
      for (const raw of body.members) {
        const parsed = addMemberSchema.safeParse(raw)
        if (!parsed.success) {
          summary.skipped.push(
            `${typeof raw?.personName === 'string' && raw.personName.trim() ? raw.personName.trim() : 'A row'}: ${parsed.error.issues[0]?.message ?? 'not valid'}`
          )
          continue
        }
        const outcome = await addOrRejoin(lifeLine.id, parsed.data)
        if (outcome.result === 'added') summary.added++
        else if (outcome.result === 'rejoined') summary.rejoined++
        else summary.alreadyMembers.push(outcome.name)
      }

      const parts = [
        `${summary.added} added`,
        summary.rejoined ? `${summary.rejoined} brought back` : null,
        summary.alreadyMembers.length ? `${summary.alreadyMembers.length} already members` : null,
        summary.skipped.length ? `${summary.skipped.length} skipped` : null,
      ].filter(Boolean)
      return createSuccessResponse(summary, `${lifeLine.title}: ${parts.join(', ')}`)
    }

    const parsed = addMemberSchema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0]?.message || 'Please check the form', 400)
    }

    const outcome = await addOrRejoin(lifeLine.id, parsed.data)
    if (outcome.result === 'already') {
      return createErrorResponse(`${outcome.name} is already a member of ${lifeLine.title}`, 409)
    }
    return createSuccessResponse(
      outcome.member,
      outcome.result === 'rejoined'
        ? `${outcome.name} is back in ${lifeLine.title}`
        : `${outcome.name} added to ${lifeLine.title}`
    )
  } catch (error) {
    console.error('Error adding member:', error)
    return createErrorResponse('Failed to add member', 500)
  }
}

/** Most people one spreadsheet upload may add. */
const MAX_PER_UPLOAD = 300

type AddOutcome =
  | { result: 'added' | 'rejoined'; name: string; member: unknown }
  | { result: 'already'; name: string }

/**
 * Add one person, or bring back the record they already have in this group.
 *
 * The same person twice would mean two rows, two emails from the leader, and
 * a member count that's wrong. Match on email where there is one, otherwise
 * on the name.
 */
async function addOrRejoin(
  lifeLineId: string,
  data: z.infer<typeof addMemberSchema>
): Promise<AddOutcome> {
  const personName = data.personName
  const personEmail = data.personEmail || null
  const personPhone = data.personPhone || null
  const note = data.note || null

  const existing = await prisma.inquiry.findFirst({
    where: {
      lifeLineId,
      ...(personEmail
        ? { personEmail: { equals: personEmail, mode: 'insensitive' } }
        : { personName: { equals: personName, mode: 'insensitive' } }),
    },
    orderBy: { createdAt: 'desc' },
  })

  if (existing?.status === InquiryStatus.JOINED) {
    return { result: 'already', name: existing.personName }
  }

  const now = new Date()
  if (existing) {
    // Someone who left, was removed, or asked and never joined: bring the
    // same record back rather than starting a second one.
    const member = await prisma.inquiry.update({
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
    return { result: 'rejoined', name: personName, member }
  }

  const member = await prisma.inquiry.create({
    data: {
      lifeLineId,
      personName,
      personEmail,
      personPhone,
      leaderNotes: note,
      status: InquiryStatus.JOINED,
      source: InquirySource.DIRECT_REFERRAL,
      joinedAt: now,
    },
  })
  return { result: 'added', name: personName, member }
}
