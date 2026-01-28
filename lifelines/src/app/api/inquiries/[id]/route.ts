import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/api-utils'
import { updateInquiryStatusSchema } from '@/lib/validations'

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

    // Check if inquiry exists
    const existingInquiry = await prisma.inquiry.findUnique({
      where: { id },
      include: {
        lifeLine: true
      }
    })

    if (!existingInquiry) {
      return createErrorResponse('Inquiry not found', 404)
    }

    // Determine if we need to set or clear joinedAt based on status change
    const updateData: any = { ...validatedData }

    if (validatedData.status === 'JOINED' && existingInquiry.status !== 'JOINED') {
      // Setting status to JOINED - record the timestamp
      updateData.joinedAt = new Date()
    } else if (validatedData.status !== 'JOINED' && existingInquiry.status === 'JOINED') {
      // Changing away from JOINED - clear the timestamp
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