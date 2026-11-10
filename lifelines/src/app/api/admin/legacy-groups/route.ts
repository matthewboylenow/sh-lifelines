import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { hasRole } from '@/lib/auth-utils'
import { normalizeLegacyLeaders } from '@/lib/legacy-leaders'
import { pushLegacyGroupsLive } from '@/lib/legacy-groups'
import { UserRole } from '@prisma/client'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: createErrorResponse('Unauthorized', 401) }
  if (!hasRole(session.user.roles, UserRole.ADMIN)) {
    return { error: createErrorResponse('Only administrators can manage legacy small groups', 403) }
  }
  return { error: null }
}

// GET /api/admin/legacy-groups - Every legacy small group, for the admin tab
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const groups = await prisma.lifeLine.findMany({
      where: { isLegacy: true },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        groupLeader: true,
        legacyLeaders: true,
        legacyNotes: true,
        meetingFrequency: true,
        location: true,
        updatedAt: true,
        leaders: { select: { id: true, displayName: true, email: true, lastLoginAt: true } },
        _count: { select: { inquiries: true } },
      },
    })

    return createSuccessResponse(
      groups.map(({ legacyLeaders, _count, ...group }) => ({
        ...group,
        legacyLeaders: normalizeLegacyLeaders(legacyLeaders),
        memberCount: _count.inquiries,
      }))
    )
  } catch (err) {
    console.error('Error listing legacy groups:', err)
    return createErrorResponse('Failed to load legacy small groups', 500)
  }
}

// POST /api/admin/legacy-groups - { action: "publish" } pushes every draft live
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await req.json().catch(() => ({}))
    if (body?.action !== 'publish') {
      return createErrorResponse('Unknown action', 400)
    }

    const result = await pushLegacyGroupsLive()
    return createSuccessResponse(
      result,
      `${result.published.length} legacy group${result.published.length === 1 ? '' : 's'} pushed live`
    )
  } catch (err) {
    console.error('Error pushing legacy groups live:', err)
    return createErrorResponse('Failed to push legacy groups live', 500)
  }
}
