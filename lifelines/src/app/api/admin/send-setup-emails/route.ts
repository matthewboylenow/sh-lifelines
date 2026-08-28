import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { generateResetToken, hasRole } from '@/lib/auth-utils'
import { sendAccountSetupEmail, renderAccountSetupEmail, sendEmail, appUrl } from '@/lib/email'
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
  scope: z.enum(['leaders-never-logged-in', 'staff-never-logged-in']).optional(),
  // Send a single copy to the signed-in admin instead of to real leaders.
  test: z.boolean().optional(),
  // Optional admin-authored copy; blank falls back to the defaults.
  subject: z.string().max(200).optional(),
  intro: z.string().max(4000).optional(),
}).refine(
  (data) => data.test || (data.userIds && data.userIds.length > 0) || data.scope,
  { message: 'Provide userIds, a scope, or test mode' }
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
    const { userIds, scope, test, subject, intro } = parsed.data

    // Test mode: send one copy to the admin using a placeholder link, so the
    // real invitations can be checked in an inbox before going out. No token is
    // issued and no recipient's account is touched.
    if (test) {
      const adminEmail = session.user.email
      if (!adminEmail) {
        return createErrorResponse('Your account has no email address to send a test to', 400)
      }

      const { subject: renderedSubject, html } = renderAccountSetupEmail({
        displayName: session.user.name || 'Maria Fusillo',
        setupUrl: `${appUrl()}/reset-password?token=EXAMPLE-PREVIEW-LINK`,
        expiresInDays: SETUP_TOKEN_DAYS,
        intro,
        subject,
      })

      await sendEmail({
        to: adminEmail,
        subject: `[Test] ${renderedSubject}`,
        html,
      })

      return createSuccessResponse(
        { sent: 1, failed: 0, test: true, results: [{ email: adminEmail, sent: true }] },
        `Test invitation sent to ${adminEmail}`
      )
    }

    const users = await prisma.user.findMany({
      where: userIds && userIds.length > 0
        ? { id: { in: userIds }, isActive: true }
        : {
            isActive: true,
            lastLoginAt: null,
            // Anyone who needs to sign in to do their job — the formation and
            // support team have the same first-time problem leaders do.
            roles: {
              hasSome:
                scope === 'staff-never-logged-in'
                  ? [UserRole.LIFELINE_LEADER, UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN]
                  : [UserRole.LIFELINE_LEADER],
            },
          },
      select: { id: true, email: true, displayName: true },
    })

    if (users.length === 0) {
      return createSuccessResponse(
        { sent: 0, failed: 0, results: [] },
        scope ? 'Nobody is awaiting first sign-in' : 'No matching active users'
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
          SETUP_TOKEN_DAYS,
          { intro, subject, userId: user.id }
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

    // Split out so the banner can say who is still waiting, rather than
    // counting only leaders and quietly ignoring the formation and support team.
    const [leaderCount, staffCount] = await Promise.all([
      prisma.user.count({
        where: { isActive: true, lastLoginAt: null, roles: { has: UserRole.LIFELINE_LEADER } },
      }),
      prisma.user.count({
        where: {
          isActive: true,
          lastLoginAt: null,
          roles: {
            hasSome: [UserRole.LIFELINE_LEADER, UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN],
          },
        },
      }),
    ])

    return createSuccessResponse({ pendingCount: leaderCount, staffPendingCount: staffCount })
  } catch (error) {
    console.error('Error counting people awaiting first sign-in:', error)
    return createErrorResponse('Failed to count people awaiting first sign-in', 500)
  }
}
