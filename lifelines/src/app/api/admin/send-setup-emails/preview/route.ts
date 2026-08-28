import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { hasRole } from '@/lib/auth-utils'
import {
  renderAccountSetupEmail,
  DEFAULT_SETUP_EMAIL_SUBJECT,
  DEFAULT_SETUP_EMAIL_INTRO,
  appUrl,
} from '@/lib/email'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const previewSchema = z.object({
  subject: z.string().optional(),
  intro: z.string().optional(),
  displayName: z.string().optional(),
})

// POST /api/admin/send-setup-emails/preview - Render the invitation as it will send
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Unauthorized', 401)
    }
    if (!hasRole(session.user.roles, UserRole.ADMIN)) {
      return createErrorResponse('Forbidden', 403)
    }

    const body = await req.json().catch(() => ({}))
    const parsed = previewSchema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse('Invalid preview request', 400)
    }

    // Rendered through the same function the real send uses, so the preview
    // cannot drift from what recipients actually receive. The link is a
    // placeholder — real tokens are only minted when sending.
    const { subject, html } = renderAccountSetupEmail({
      displayName: parsed.data.displayName?.trim() || 'Maria Fusillo',
      setupUrl: `${appUrl()}/reset-password?token=EXAMPLE-PREVIEW-LINK`,
      expiresInDays: 7,
      intro: parsed.data.intro,
      subject: parsed.data.subject,
    })

    return createSuccessResponse({
      subject,
      html,
      defaults: {
        subject: DEFAULT_SETUP_EMAIL_SUBJECT,
        intro: DEFAULT_SETUP_EMAIL_INTRO,
      },
    })
  } catch (error) {
    console.error('Error rendering setup email preview:', error)
    return createErrorResponse('Failed to render preview', 500)
  }
}
