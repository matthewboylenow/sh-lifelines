import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
  parsePaginationParams,
  createPaginatedResponse,
  withAuth
} from '@/lib/api-utils'
import { UserRole, ResourceType } from '@prisma/client'
import { z } from 'zod'

// Validation schema for creating/updating resources
const resourceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  resourceType: z.nativeEnum(ResourceType),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  isActive: z.boolean().optional()
})

// GET /api/resources - List all resources
export async function GET(req: NextRequest) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const { searchParams } = new URL(req.url)
      const { page, limit, skip } = parsePaginationParams(searchParams)

      // Parse filters
      const resourceType = searchParams.get('type') as ResourceType | null
      const isActive = searchParams.get('active')
      const search = searchParams.get('search')

      // Build where clause
      const where: any = {}

      // Non-admins only see active resources
      const isAdmin = session.user.role === UserRole.ADMIN
      if (!isAdmin) {
        where.isActive = true
      } else if (isActive !== null) {
        where.isActive = isActive === 'true'
      }

      if (resourceType) {
        where.resourceType = resourceType
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }

      const [resources, total] = await Promise.all([
        prisma.resource.findMany({
          where,
          orderBy: [
            { resourceType: 'asc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: limit
        }),
        prisma.resource.count({ where })
      ])

      return createSuccessResponse(
        createPaginatedResponse(resources, total, page, limit)
      )
    } catch (error) {
      console.error('Error fetching resources:', error)
      return createErrorResponse('Failed to fetch resources', 500)
    }
  })(req)
}

// POST /api/resources - Create new resource (Admin only)
export async function POST(req: NextRequest) {
  return withAuth(async (req: NextRequest, session: any) => {
    // Only admins can create resources
    if (session.user.role !== UserRole.ADMIN) {
      return createErrorResponse('Only administrators can create resources', 403)
    }

    try {
      const body = await req.json()
      const validatedData = resourceSchema.parse(body)

      // Clean up empty strings
      const data = {
        ...validatedData,
        websiteUrl: validatedData.websiteUrl || null,
        fileUrl: validatedData.fileUrl || null,
        fileName: validatedData.fileName || null,
        fileSize: validatedData.fileSize || null,
        isActive: validatedData.isActive ?? true
      }

      const resource = await prisma.resource.create({
        data
      })

      return createSuccessResponse(resource, 'Resource created successfully')
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(error.issues[0].message, 400)
      }
      console.error('Error creating resource:', error)
      return createErrorResponse('Failed to create resource', 500)
    }
  })(req)
}
