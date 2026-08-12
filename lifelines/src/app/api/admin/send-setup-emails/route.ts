import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { generateResetToken, hasRole } from '@/lib/auth-utils'
import { sendAccountSetupEmail } from '@/lib/email'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

// Setup links are invitations rather than resets, so they get a longer window
// than the 1-hour password-reset token.
const SETUP_TOKEN_DAYS = 7

const requestSchema = z.object({
  // Explicit list of users to invite.
  userIds: z.array(z.string()).optional(),
  // Or invite every leader who has never signed in — the common case after a
  // bulk import, where accounts exist with passwords nobody knows.
  scope: z.enum(['leaders-never-logged-in']).optional(),
}).refine(
  (data) => (data.userIds && data.userIds.length > 0) || data.scope,
  { message: 'Provide userIds or a scope' }
)

// POST /api/admin/send-setup-emails - Invite users to set their own password
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Unauthorized', 401)
    }
    if (!hasRole(session.user.roles, UserRole.ADMIN)) {
      return createErrorResponse('Forbidden', 403)
    }

    const body = await req.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse(
        `Validation error: ${parsed.error.issues.map(i => i.message).join(', ')}`,
        400
      )
    }
    const { userIds, scope } = parsed.data

    const users = await prisma.user.findMany({
      where: userIds && userIds.length > 0
        ? { id: { in: userIds }, isActive: true }
        : {
            isActive: true,
            lastLoginAt: null,
            roles: { has: UserRole.LIFELINE_LEADER },
          },
      select: { id: true, email: true, displayName: true },
    })

    if (users.length === 0) {
      return createSuccessResponse(
        { sent: 0, failed: 0, results: [] },
        scope ? 'No leaders are awaiting first sign-in' : 'No matching active users'
      )
    }

    const expiry = new Date(Date.now() + SETUP_TOKEN_DAYS * 24 * 60 * 60 * 1000)
    const results: Array<{ email: string; sent: boolean; error?: string }> = []

    // Sent sequentially: a failed send must not leave a token issued without an
    // email to use it, and this keeps us within provider rate limits.
    for (const user of users) {
      const token = generateResetToken()
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken: token, resetTokenExpiry: expiry },
        })

        await sendAccountSetupEmail(
          user.email,
          user.displayName || user.email,
          token,
          SETUP_TOKEN_DAYS
        )

        results.push({ email: user.email, sent: true })
      } catch (error) {
        console.error(`Failed to send setup email to ${user.email}:`, error)
        // Clear the unusable token so a stale link can't linger.
        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken: null, resetTokenExpiry: null },
        }).catch(() => {})

        results.push({
          email: user.email,
          sent: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const sent = results.filter(r => r.sent).length
    const failed = results.length - sent

    return createSuccessResponse(
      { sent, failed, results },
      `Sent ${sent} setup email${sent === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}`
    )
  } catch (error) {
    console.error('Error sending setup emails:', error)
    return createErrorResponse('Failed to send setup emails', 500)
  }
}

// GET /api/admin/send-setup-emails - How many leaders are awaiting first sign-in
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Unauthorized', 401)
    }
    if (!hasRole(session.user.roles, UserRole.ADMIN)) {
      return createErrorResponse('Forbidden', 403)
    }

    const pendingCount = await prisma.user.count({
      where: {
        isActive: true,
        lastLoginAt: null,
        roles: { has: UserRole.LIFELINE_LEADER },
      },
    })

    return createSuccessResponse({ pendingCount })
  } catch (error) {
    console.error('Error counting pending leaders:', error)
    return createErrorResponse('Failed to count pending leaders', 500)
  }
}
