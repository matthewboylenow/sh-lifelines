import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { hasAnyRole } from '@/lib/auth-utils'
import { UserRole } from '@prisma/client'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * Mint a short-lived link for a resource stored privately in S3.
 *
 * Training material lives in a bucket with no public read access, so it can
 * only be reached through a signed URL. Signing happens here, behind the same
 * role check that guards the resources page, and the link is deliberately
 * short-lived — long enough to watch, not to pass around.
 */
const LINK_TTL_SECONDS = 60 * 60 * 4

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
})

// GET /api/resources/[id]/media - Signed link for a privately stored resource
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Unauthorized', 401)
    }
    // Same audience as the resources page itself.
    if (!hasAnyRole(session.user.roles, [
      UserRole.ADMIN,
      UserRole.FORMATION_SUPPORT_TEAM,
      UserRole.LIFELINE_LEADER,
    ])) {
      return createErrorResponse('Forbidden', 403)
    }

    const { id } = await params
    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { id: true, title: true, videoUrl: true, fileUrl: true, isActive: true },
    })

    if (!resource || !resource.isActive) {
      return createErrorResponse('Resource not found', 404)
    }

    const stored = resource.videoUrl || resource.fileUrl
    if (!stored || !stored.startsWith('s3://')) {
      return createErrorResponse('This resource is not stored privately', 400)
    }

    const key = stored.slice('s3://'.length)
    const bucket = process.env.AWS_S3_BUCKET_NAME
    if (!bucket) {
      return createErrorResponse('File storage is not configured', 500)
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: LINK_TTL_SECONDS }
    )

    return createSuccessResponse({
      url,
      expiresIn: LINK_TTL_SECONDS,
      kind: resource.videoUrl ? 'video' : 'file',
    })
  } catch (error) {
    console.error('Error signing resource media URL:', error)
    return createErrorResponse('Could not prepare that resource', 500)
  }
}
