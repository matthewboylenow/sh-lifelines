import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  withAuth,
  withValidation 
} from '@/lib/api-utils'
import { updateProfileSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/auth-utils'
import { z } from 'zod'

// GET /api/users/profile - Get current user profile
export async function GET(req: NextRequest) {
  return withAuth(async (req: NextRequest, session: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        ledLifeLines: {
          select: {
            id: true,
            title: true,
            status: true,
            _count: {
              select: {
                inquiries: true
              }
            }
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
    console.error('Error fetching user profile:', error)
    return createErrorResponse('Failed to fetch user profile', 500)
  }
  })(req)
}

// PUT /api/users/profile - Update current user profile
const updateProfileWithPasswordSchema = updateProfileSchema.extend({
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number')
    .optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) {
    return false
  }
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false
  }
  return true
}, {
  message: "Current password is required to change password, and new passwords must match",
  path: ["currentPassword"]
})

export async function PUT(req: NextRequest) {
  return withAuth(
  async (req: NextRequest, session: any) => {
    return withValidation(
      updateProfileWithPasswordSchema,
      async (req: NextRequest, validatedData: any) => {
        const { currentPassword, newPassword, confirmPassword, ...profileData } = validatedData

        try {
          // Get current user data
          const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id }
          })

          if (!currentUser) {
            return createErrorResponse('User not found', 404)
          }

          // If email is being changed, check if new email is available
          if (profileData.email && profileData.email !== currentUser.email) {
            const existingUser = await prisma.user.findUnique({
              where: { email: profileData.email }
            })

            if (existingUser) {
              return createErrorResponse('Email address is already in use', 400)
            }
          }

          const updateData: any = { ...profileData }

          // Handle password change
          if (newPassword && currentPassword) {
            const { verifyPassword } = await import('@/lib/auth-utils')
            const isCurrentPasswordValid = await verifyPassword(currentPassword, currentUser.password)
            
            if (!isCurrentPasswordValid) {
              return createErrorResponse('Current password is incorrect', 400)
            }

            updateData.password = await hashPassword(newPassword)
          }

          // Update user
          const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
              isActive: true,
              updatedAt: true,
            }
          })

          return createSuccessResponse(updatedUser, 'Profile updated successfully')
        } catch (error) {
          console.error('Error updating profile:', error)
          return createErrorResponse('Failed to update profile', 500)
        }
      }
    )(req)
  })(req)
}