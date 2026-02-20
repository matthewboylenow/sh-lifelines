import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse
} from '@/lib/api-utils'
import { updateInquiryStatusSchema } from '@/lib/validations'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'

// GET /api/inquiries/[id] - Get specific inquiry
export async function GET(req: NextRequest) {
  try {
    // Extract ID from URL
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('inquiries') + 1
    const id = pathParts[idIndex]

    if (!id) {
      return createErrorResponse('Inquiry ID not found', 400)
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id },
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
        }
      }
    })

    if (!inquiry) {
      return createErrorResponse('Inquiry not found', 404)
    }

    return createSuccessResponse(inquiry)
  } catch (error) {
    console.error('Error fetching inquiry:', error)
    return createErrorResponse('Failed to fetch inquiry', 500)
  }
}

// PATCH /api/inquiries/[id] - Update inquiry status
export async function PATCH(req: NextRequest) {
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
    const validatedData = updateInquiryStatusSchema.parse(body)

    // Check if inquiry exists and load LifeLine for authorization
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
      return createErrorResponse('Forbidden: You do not have permission to update this inquiry', 403)
    }

    // Determine if we need to set or clear joinedAt based on status change
    const updateData: any = { ...validatedData }

    if (validatedData.status === 'JOINED' && existingInquiry.status !== 'JOINED') {
      updateData.joinedAt = new Date()
    } else if (validatedData.status !== 'JOINED' && existingInquiry.status === 'JOINED') {
      updateData.joinedAt = null
    }

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: updateData,
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
        }
      }
    })

    return createSuccessResponse(inquiry, 'Inquiry status updated successfully')
  } catch (error) {
    console.error('Error updating inquiry:', error)
    return createErrorResponse('Failed to update inquiry', 500)
  }
}

// PUT /api/inquiries/[id] - Update inquiry status (backward compatibility)
export async function PUT(req: NextRequest) {
  return PATCH(req)
}
