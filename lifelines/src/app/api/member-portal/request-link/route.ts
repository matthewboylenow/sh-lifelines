import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { sendMemberPortalLinkEmail } from '@/lib/email'
import {
  generatePortalToken,
  hashPortalToken,
  isWithinRequestCooldown,
  normalizePortalEmail,
  PORTAL_TOKEN_TTL_MINUTES,
} from '@/lib/member-portal'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

// Always returned regardless of whether the address is on file, so this
// endpoint can't be used to discover who belongs to a LifeLine.
const GENERIC_RESPONSE =
  'If that email address is associated with a LifeLine, we have sent a link to manage it.'

// POST /api/member-portal/request-link - Email a sign-in link to a member
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse(
        parsed.error.issues[0]?.message || 'Please enter a valid email address',
        400
      )
    }

    const email = normalizePortalEmail(parsed.data.email)

    // Rate-limit before doing any work, and respond identically either way.
    if (await isWithinRequestCooldown(email)) {
      return createSuccessResponse({ sent: true }, GENERIC_RESPONSE)
    }

    const membership = await prisma.inquiry.findFirst({
      where: {
        personEmail: { equals: email, mode: 'insensitive' },
        status: { in: ['JOINED', 'UNDECIDED'] },
      },
      select: { id: true },
    })

    // No LifeLines on file: stop here, but report the same message.
    if (!membership) {
      return createSuccessResponse({ sent: true }, GENERIC_RESPONSE)
    }

    const rawToken = generatePortalToken()
    const expiresAt = new Date(Date.now() + PORTAL_TOKEN_TTL_MINUTES * 60 * 1000)

    await prisma.memberPortalToken.create({
      data: { email, tokenHash: hashPortalToken(rawToken), expiresAt },
    })

    const portalUrl = `${process.env.APP_URL}/my-lifelines?token=${rawToken}`

    try {
      await sendMemberPortalLinkEmail(email, portalUrl, PORTAL_TOKEN_TTL_MINUTES)
    } catch (emailError) {
      console.error('Failed to send member portal link:', emailError)
      // Drop the token rather than leave a live link nobody received.
      await prisma.memberPortalToken
        .deleteMany({ where: { tokenHash: hashPortalToken(rawToken) } })
        .catch(() => {})
      return createErrorResponse(
        'We could not send the email just now. Please try again shortly.',
        500
      )
    }

    return createSuccessResponse({ sent: true }, GENERIC_RESPONSE)
  } catch (error) {
    console.error('Error requesting member portal link:', error)
    return createErrorResponse('Something went wrong. Please try again.', 500)
  }
}
