import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { updateProfileSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/auth-utils'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/users/[id] - Get specific user
export async function GET(req: NextRequest, context: RouteParams) {
  try {
    const { params } = context
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        ledLifeLines: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        },
        _count: {
          select: {
            formationRequests: true,
            supportTickets: true,
          }
        }
      }
    })

    if (!user) {
      return createErrorResponse('User not found', 404)
    }

    return createSuccessResponse(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return createErrorResponse('Failed to fetch user', 500)
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(req: NextRequest, context: RouteParams) {
  try {
    const { params } = context
    const { id } = await params
    const body = await req.json()
    const validatedData = updateProfileSchema.extend({
      role: z.nativeEnum(UserRole).optional(),
      roles: z.array(z.nativeEnum(UserRole)).optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    }).parse(body)

    const { role, roles, isActive, password, ...profileData } = validatedData

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return createErrorResponse('User not found', 404)
    }

    // Prepare update data
    const updateData: any = { ...profileData }

    // Support both single role and roles array
    if (roles !== undefined) {
      updateData.roles = roles
    } else if (role !== undefined) {
      updateData.roles = [role]
    }

    if (isActive !== undefined) updateData.isActive = isActive

    if (password) {
      updateData.password = await hashPassword(password)
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return createSuccessResponse(user, 'User updated successfully')
  } catch (error) {
    console.error('Error updating user:', error)
    return createErrorResponse('Failed to update user', 500)
  }
}

// DELETE /api/users/[id] - Delete user (Admin only)
export async function DELETE(req: NextRequest, context: RouteParams) {
  try {
    const { params } = context
    const { id } = await params

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return createErrorResponse('User not found', 404)
    }

    // Check if user has associated data
    const userWithData = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            ledLifeLines: true,
            formationRequests: true,
            supportTickets: true,
          }
        }
      }
    })

    const hasData = (userWithData?._count?.ledLifeLines || 0) > 0 ||
                   (userWithData?._count?.formationRequests || 0) > 0 ||
                   (userWithData?._count?.supportTickets || 0) > 0

    if (hasData) {
      // Instead of deleting, deactivate the user
      await prisma.user.update({
        where: { id },
        data: { isActive: false }
      })

      return createSuccessResponse(
        null,
        'User has associated data and has been deactivated instead of deleted'
      )
    }

    // Safe to delete
    await prisma.user.delete({
      where: { id }
    })

    return createSuccessResponse(null, 'User deleted successfully')
  } catch (error) {
    console.error('Error deleting user:', error)
    return createErrorResponse('Failed to delete user', 500)
  }
}
