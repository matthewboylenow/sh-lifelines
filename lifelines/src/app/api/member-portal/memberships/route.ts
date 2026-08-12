import { NextRequest } from 'next/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { getMemberships, verifyPortalToken, LEAVE_REASONS } from '@/lib/member-portal'

// POST /api/member-portal/memberships - LifeLines for a valid portal token
//
// POST rather than GET so the token travels in the body instead of the query
// string, keeping it out of referrer headers and server access logs.
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json().catch(() => ({ token: null }))

    const session = await verifyPortalToken(token)
    if (!session) {
      return createErrorResponse('This link is invalid or has expired', 401)
    }

    const memberships = await getMemberships(session.email)

    return createSuccessResponse({
      email: session.email,
      memberships,
      leaveReasons: LEAVE_REASONS,
    })
  } catch (error) {
    console.error('Error loading member portal memberships:', error)
    return createErrorResponse('Failed to load your LifeLines', 500)
  }
}
