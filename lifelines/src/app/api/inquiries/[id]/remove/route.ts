import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse
} from '@/lib/api-utils'
import { removeInquiryMemberSchema } from '@/lib/validations'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole, InquiryStatus } from '@prisma/client'

// POST /api/inquiries/[id]/remove - Remove a member from a LifeLine
export async function POST(req: NextRequest) {
  try {
    // Auth check: require login
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Unauthorized', 401)
    }

    // Extract ID from URL
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('inquiries') + 1
    const id = pathParts[idIndex]

    if (!id) {
      return createErrorResponse('Inquiry ID not found', 400)
    }

    const body = await req.json()
    const { removedReason } = removeInquiryMemberSchema.parse(body)

    // Load inquiry with LifeLine for authorization
    const existingInquiry = await prisma.inquiry.findUnique({
      where: { id },
      include: {
        lifeLine: true
      }
    })

    if (!existingInquiry) {
      return createErrorResponse('Inquiry not found', 404)
    }

    // Authorization: must be LifeLine leader, Formation Support, or Admin
    const userRole = session.user.role as UserRole
    const isLeader = existingInquiry.lifeLine.leaderId === session.user.id
    const isSupportOrAdmin = userRole === UserRole.ADMIN || userRole === UserRole.FORMATION_SUPPORT_TEAM

    if (!isLeader && !isSupportOrAdmin) {
      return createErrorResponse('Forbidden: You do not have permission to remove members from this LifeLine', 403)
    }

    // Cannot remove someone who is already removed
    if (existingInquiry.status === InquiryStatus.REMOVED) {
      return createErrorResponse('This member has already been removed', 400)
    }

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: {
        status: InquiryStatus.REMOVED,
        removedReason,
        removedAt: new Date(),
        removedById: session.user.id,
        joinedAt: null,
      },
      include: {
        lifeLine: {
          include: {
            leader: {
              select: {
                id: true,
                displayName: true,
                email: true,
              }
            }
          }
        },
        removedBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        }
      }
    })

    return createSuccessResponse(inquiry, 'Member removed from LifeLine successfully')
  } catch (error) {
    console.error('Error removing member:', error)
    return createErrorResponse('Failed to remove member', 500)
  }
}
