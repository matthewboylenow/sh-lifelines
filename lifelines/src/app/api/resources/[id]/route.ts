import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
  withAuth
} from '@/lib/api-utils'
import { UserRole, ResourceType } from '@prisma/client'
import { z } from 'zod'

// Validation schema for updating resources
const updateResourceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  resourceType: z.nativeEnum(ResourceType).optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  isActive: z.boolean().optional()
})

// GET /api/resources/[id] - Get single resource
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const { id } = await params

      const resource = await prisma.resource.findUnique({
        where: { id }
      })

      if (!resource) {
        return createErrorResponse('Resource not found', 404)
      }

      // Non-admins can only see active resources
      const isAdmin = session.user.role === UserRole.ADMIN
      if (!isAdmin && !resource.isActive) {
        return createErrorResponse('Resource not found', 404)
      }

      return createSuccessResponse(resource)
    } catch (error) {
      console.error('Error fetching resource:', error)
      return createErrorResponse('Failed to fetch resource', 500)
    }
  })(req)
}

// PUT /api/resources/[id] - Update resource (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req: NextRequest, session: any) => {
    // Only admins can update resources
    if (session.user.role !== UserRole.ADMIN) {
      return createErrorResponse('Only administrators can update resources', 403)
    }

    try {
      const { id } = await params
      const body = await req.json()
      const validatedData = updateResourceSchema.parse(body)

      // Check if resource exists
      const existing = await prisma.resource.findUnique({
        where: { id }
      })

      if (!existing) {
        return createErrorResponse('Resource not found', 404)
      }

      // Clean up empty strings
      const data: any = { ...validatedData }
      if (data.websiteUrl === '') data.websiteUrl = null
      if (data.fileUrl === '') data.fileUrl = null
      if (data.fileName === '') data.fileName = null

      const resource = await prisma.resource.update({
        where: { id },
        data
      })

      return createSuccessResponse(resource, 'Resource updated successfully')
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(error.issues[0].message, 400)
      }
      console.error('Error updating resource:', error)
      return createErrorResponse('Failed to update resource', 500)
    }
  })(req)
}

// DELETE /api/resources/[id] - Delete resource (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req: NextRequest, session: any) => {
    // Only admins can delete resources
    if (session.user.role !== UserRole.ADMIN) {
      return createErrorResponse('Only administrators can delete resources', 403)
    }

    try {
      const { id } = await params

      // Check if resource exists
      const existing = await prisma.resource.findUnique({
        where: { id }
      })

      if (!existing) {
        return createErrorResponse('Resource not found', 404)
      }

      await prisma.resource.delete({
        where: { id }
      })

      return createSuccessResponse(null, 'Resource deleted successfully')
    } catch (error) {
      console.error('Error deleting resource:', error)
      return createErrorResponse('Failed to delete resource', 500)
    }
  })(req)
}
