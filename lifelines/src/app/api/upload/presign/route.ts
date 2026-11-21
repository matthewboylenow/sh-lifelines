import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { hasAnyRole } from '@/lib/auth-utils'
import { generatePresignedUploadUrl } from '@/lib/s3'
import { UPLOAD_RULES, UploadPurpose, uploadContentType } from '@/lib/upload-rules'
import { UserRole } from '@prisma/client'

const requestSchema = z.object({
  purpose: z.enum(['resource', 'lifeline-image']),
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().max(200).optional().default(''),
  fileSize: z.number().int().positive(),
})

/** Who may upload what. */
const ALLOWED_ROLES: Record<UploadPurpose, UserRole[]> = {
  // Resources are managed by admins.
  resource: [UserRole.ADMIN],
  // Anyone who can edit a LifeLine can set its picture.
  'lifeline-image': [UserRole.ADMIN, UserRole.FORMATION_SUPPORT_TEAM, UserRole.LIFELINE_LEADER],
}

/**
 * POST /api/upload/presign - Permission to upload one file straight to storage.
 *
 * Files used to be sent through this server on their way to S3, and Vercel
 * refuses any request over 4.5 MB, so a large PDF could not be uploaded at
 * all. Instead the browser asks here first: the file's type and size are
 * checked, and the reply is a short-lived link that accepts exactly that one
 * upload. The file then goes from the browser to S3 directly.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const parsed = requestSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return createErrorResponse('Invalid upload request', 400)
    }
    const { purpose, fileName, fileSize } = parsed.data

    if (!hasAnyRole(session.user.roles, ALLOWED_ROLES[purpose])) {
      return createErrorResponse('You do not have permission to upload this', 403)
    }

    const rule = UPLOAD_RULES[purpose]
    const contentType = uploadContentType(purpose, fileName, parsed.data.fileType)
    if (!contentType) {
      return createErrorResponse(rule.typeError, 400)
    }
    if (fileSize > rule.maxBytes) {
      return createErrorResponse(
        `That file is ${(fileSize / 1024 / 1024).toFixed(1)} MB. The limit is ${rule.maxBytes / 1024 / 1024} MB.`,
        400
      )
    }

    // A random name, so one upload can never overwrite another. The original
    // name is kept for downloads.
    const extension = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : ''
    const key = `${rule.folder}/${randomUUID()}${extension ? `.${extension}` : ''}`

    const signed = await generatePresignedUploadUrl(key, contentType, 60 * 10)
    if (!signed.success || !signed.url) {
      return createErrorResponse(signed.error || 'File storage is not available', 500)
    }

    return createSuccessResponse({
      uploadUrl: signed.url,
      contentType,
      // Resources are private and downloaded through a signed link; LifeLine
      // pictures are public and served by /api/images.
      fileUrl: purpose === 'resource' ? `s3://${key}` : `/api/images/${key}`,
      fileName,
      fileSize,
    })
  } catch (error) {
    console.error('Error preparing upload:', error)
    return createErrorResponse('Failed to prepare upload', 500)
  }
}
