import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/api-utils'
import { updateLifeLineSchema } from '@/lib/validations'

// GET /api/lifelines/[id] - Get specific LifeLine
export async function GET(req: NextRequest) {
  try {
    // Extract ID from URL
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('lifelines') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return createErrorResponse('LifeLine ID not found', 400)
    }

    const lifeLine = await prisma.lifeLine.findUnique({
      where: { id },
      include: {
        leader: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        },
        inquiries: {
          select: {
            id: true,
            personName: true,
            personEmail: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10, // Only recent inquiries for performance
        },
        _count: {
          select: {
            inquiries: true
          }
        }
      }
    })

    if (!lifeLine) {
      return createErrorResponse('LifeLine not found', 404)
    }

    return createSuccessResponse(lifeLine)
  } catch (error) {
    console.error('Error fetching LifeLine:', error)
    return createErrorResponse('Failed to fetch LifeLine', 500)
  }
}

// PUT /api/lifelines/[id] - Update LifeLine
export async function PUT(req: NextRequest) {
  try {
    // Extract ID from URL
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('lifelines') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return createErrorResponse('LifeLine ID not found', 400)
    }

    const body = await req.json()
    const validatedData = updateLifeLineSchema.parse(body)

    // Check if LifeLine exists
    const existingLifeLine = await prisma.lifeLine.findUnique({
      where: { id },
      include: {
        leader: true
      }
    })

    if (!existingLifeLine) {
      return createErrorResponse('LifeLine not found', 404)
    }

    // Update the LifeLine
    const lifeLine = await prisma.lifeLine.update({
      where: { id },
      data: validatedData,
      include: {
        leader: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        },
        _count: {
          select: {
            inquiries: true
          }
        }
      }
    })

    return createSuccessResponse(lifeLine, 'LifeLine updated successfully')
  } catch (error) {
    console.error('Error updating LifeLine:', error)
    return createErrorResponse('Failed to update LifeLine', 500)
  }
}

// DELETE /api/lifelines/[id] - Delete LifeLine
export async function DELETE(req: NextRequest) {
  try {
    // Extract ID from URL
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('lifelines') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return createErrorResponse('LifeLine ID not found', 400)
    }

    // Check if LifeLine exists and has no inquiries
    const existingLifeLine = await prisma.lifeLine.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            inquiries: true
          }
        }
      }
    })

    if (!existingLifeLine) {
      return createErrorResponse('LifeLine not found', 404)
    }

    if (existingLifeLine._count.inquiries > 0) {
      return createErrorResponse('Cannot delete LifeLine with existing inquiries. Archive it instead.', 400)
    }

    await prisma.lifeLine.delete({
      where: { id }
    })

    return createSuccessResponse(null, 'LifeLine deleted successfully')
  } catch (error) {
    console.error('Error deleting LifeLine:', error)
    return createErrorResponse('Failed to delete LifeLine', 500)
  }
}