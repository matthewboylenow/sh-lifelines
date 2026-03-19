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
        supportContact: {
          select: {
            id: true,
            displayName: true,
            email: true,
            cellPhone: true,
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

    // Update the LifeLine with validated data
    const lifeLine = await prisma.lifeLine.update({
      where: { id },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(body.subtitle !== undefined && { subtitle: body.subtitle || null }),
        ...(validatedData.description !== undefined && { description: validatedData.description || null }),
        ...(body.groupLeader && { groupLeader: body.groupLeader }),
        ...(body.leaderId !== undefined && { leaderId: body.leaderId || null }),
        ...(validatedData.dayOfWeek !== undefined && { dayOfWeek: validatedData.dayOfWeek || null }),
        ...(validatedData.meetingTime !== undefined && { meetingTime: validatedData.meetingTime || null }),
        ...(body.location !== undefined && { location: body.location || null }),
        ...(validatedData.meetingFrequency !== undefined && { meetingFrequency: validatedData.meetingFrequency || null }),
        ...(validatedData.groupType !== undefined && { groupType: validatedData.groupType || null }),
        ...(validatedData.agesStages && { agesStages: validatedData.agesStages }),
        ...(body.maxParticipants !== undefined && { maxParticipants: body.maxParticipants || null }),
        ...(body.duration !== undefined && { duration: body.duration || null }),
        ...(body.cost !== undefined && { cost: body.cost || null }),
        ...(body.childcare !== undefined && { childcare: body.childcare || false }),
        ...(validatedData.imageUrl !== undefined && { imageUrl: validatedData.imageUrl || null }),
        ...(validatedData.imageAlt !== undefined && { imageAlt: validatedData.imageAlt || null }),
        ...(validatedData.imageAttribution !== undefined && { imageAttribution: validatedData.imageAttribution || null }),
        ...(body.status && { status: body.status }),
        ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
        ...(body.supportContactId !== undefined && { supportContactId: body.supportContactId || null }),
      },
      include: {
        leader: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        },
        supportContact: {
          select: {
            id: true,
            displayName: true,
            email: true,
            cellPhone: true,
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

// PATCH /api/lifelines/[id] - Partial update (status, visibility, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('lifelines') + 1
    const id = pathParts[idIndex]

    if (!id) {
      return createErrorResponse('LifeLine ID not found', 400)
    }

    const existingLifeLine = await prisma.lifeLine.findUnique({
      where: { id },
    })

    if (!existingLifeLine) {
      return createErrorResponse('LifeLine not found', 404)
    }

    const body = await req.json()

    const updateData: any = {}
    if (body.status !== undefined) {
      updateData.status = body.status
      updateData.isVisible = body.status === 'PUBLISHED'
    }
    if (body.isVisible !== undefined) {
      updateData.isVisible = body.isVisible
    }

    const lifeLine = await prisma.lifeLine.update({
      where: { id },
      data: updateData,
    })

    return createSuccessResponse(lifeLine, 'LifeLine updated successfully')
  } catch (error) {
    console.error('Error patching LifeLine:', error)
    return createErrorResponse('Failed to update LifeLine', 500)
  }
}

// DELETE /api/lifelines/[id] - Delete LifeLine (cascades related inquiries)
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('lifelines') + 1
    const id = pathParts[idIndex]

    if (!id) {
      return createErrorResponse('LifeLine ID not found', 400)
    }

    const existingLifeLine = await prisma.lifeLine.findUnique({
      where: { id },
    })

    if (!existingLifeLine) {
      return createErrorResponse('LifeLine not found', 404)
    }

    // Delete related inquiries first, then the LifeLine
    await prisma.$transaction(async (tx) => {
      await tx.inquiry.deleteMany({ where: { lifeLineId: id } })
      await tx.lifeLine.delete({ where: { id } })
    })

    return createSuccessResponse(null, 'LifeLine deleted successfully')
  } catch (error) {
    console.error('Error deleting LifeLine:', error)
    return createErrorResponse('Failed to delete LifeLine', 500)
  }
}