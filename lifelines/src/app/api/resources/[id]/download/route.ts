import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/api-utils'
import { hasAnyRole } from '@/lib/auth-utils'
import { generatePresignedDownloadUrl, storedObjectKey } from '@/lib/s3'
import { UserRole } from '@prisma/client'

/**
 * Open a resource's file.
 *
 * Files sit in a private bucket, so linking to them directly gives everyone
 * "access denied" — leaders included. This checks who may see the file, then
 * sends the browser on to a short-lived signed link. Resources marked public
 * are open to anyone; the rest need the same roles as the Resources page.
 */
const LINK_TTL_SECONDS = 60 * 10

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { isActive: true, isPublic: true, fileUrl: true, fileName: true },
    })

    if (!resource || !resource.isActive || !resource.fileUrl) {
      return createErrorResponse('Resource not found', 404)
    }

    if (!resource.isPublic) {
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return createErrorResponse('Unauthorized', 401)
      }
      if (!hasAnyRole(session.user.roles, [
        UserRole.ADMIN,
        UserRole.FORMATION_SUPPORT_TEAM,
        UserRole.LIFELINE_LEADER,
      ])) {
        return createErrorResponse('Forbidden', 403)
      }
    }

    const key = storedObjectKey(resource.fileUrl)

    // A file hosted somewhere else (e.g. the parish website) is already public.
    if (!key) {
      if (/^https?:\/\//i.test(resource.fileUrl)) {
        return NextResponse.redirect(resource.fileUrl, 302)
      }
      return createErrorResponse('Resource file not found', 404)
    }

    const signed = await generatePresignedDownloadUrl(
      key,
      LINK_TTL_SECONDS,
      resource.fileName || undefined
    )
    if (!signed.success || !signed.url) {
      return createErrorResponse('Could not open this file', 500)
    }

    const response = NextResponse.redirect(signed.url, 302)
    // The signed link expires; never let a cache hand out a dead one.
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  } catch (error) {
    console.error('Error opening resource file:', error)
    return createErrorResponse('Could not open this file', 500)
  }
}
