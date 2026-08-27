import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { updateProfileSchema } from '@/lib/validations'
import { hashPassword, hasRole } from '@/lib/auth-utils'
import { normalizePhone } from '@/lib/phone'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Admin-only guard shared by every method here. Users manage their own account
// through /api/users/profile; these endpoints are for administration only.
async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: createErrorResponse('Unauthorized', 401) }
  }
  if (!hasRole(session.user.roles, UserRole.ADMIN)) {
    return { error: createErrorResponse('Forbidden', 403) }
  }
  return { session }
}

// GET /api/users/[id] - Get specific user (Admin only)
export async function GET(req: NextRequest, context: RouteParams) {
  try {
    const { error } = await requireAdmin()
    if (error) return error

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
        cellPhone: true,
        cellPhoneVerified: true,
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

// PUT /api/users/[id] - Update user (Admin only)
export async function PUT(req: NextRequest, context: RouteParams) {
  try {
    const { error } = await requireAdmin()
    if (error) return error

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
    const { cellPhone, ...rest } = profileData
    const updateData: any = { ...rest }

    if (cellPhone !== undefined) {
      const trimmed = (cellPhone ?? '').trim()

      if (!trimmed) {
        updateData.cellPhone = null
        updateData.cellPhoneVerified = false
      } else {
        // Store one shape only — signing in by text looks the number up
        // exactly, so 908-451-5305 and +19084515305 must not both exist.
        const normalized = normalizePhone(trimmed)
        if (!/^\+1\d{10}$/.test(normalized)) {
          return createErrorResponse(
            'Enter a 10-digit US mobile number, for example 908-555-0142',
            400
          )
        }

        // The number is the whole credential for a text sign-in, so it cannot
        // be shared: whoever it belongs to would be able to reach both accounts.
        const claimed = await prisma.user.findFirst({
          where: { cellPhone: normalized, id: { not: id } },
          select: { displayName: true, email: true },
        })
        if (claimed) {
          return createErrorResponse(
            `That number is already on ${claimed.displayName || claimed.email}'s account`,
            409
          )
        }

        updateData.cellPhone = normalized
        // A changed number has not been proven to belong to them yet.
        if (normalized !== existingUser.cellPhone) {
          updateData.cellPhoneVerified = false
        }
      }
    }

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
        cellPhone: true,
        cellPhoneVerified: true,
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
    const { error } = await requireAdmin()
    if (error) return error

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
