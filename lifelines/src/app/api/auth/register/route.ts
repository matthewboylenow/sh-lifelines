import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
  withValidation,
  withAuth
} from '@/lib/api-utils'
import { registerSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/auth-utils'
import { UserRole } from '@prisma/client'
import { sendUserRegistrationConfirmationEmail } from '@/lib/email'
import { normalizePhone } from '@/lib/sms'

// POST /api/auth/register - Register new user (Admin only)
export const POST = withAuth(async (req: NextRequest, session: any) => {
  return withValidation(
    registerSchema,
    async (req: NextRequest, validatedData: any) => {
      const { email, password, displayName, cellPhone, roles, role } = validatedData

      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email }
        })

        if (existingUser) {
          return createErrorResponse('User with this email already exists', 400)
        }

        // Hash password
        const hashedPassword = await hashPassword(password)

        // Determine roles: prefer roles array, fall back to single role
        const userRoles = roles && roles.length > 0
          ? roles
          : role ? [role] : [UserRole.MEMBER]

        // Require cellPhone for non-member roles
        const privilegedRoles: UserRole[] = [UserRole.ADMIN, UserRole.FORMATION_SUPPORT_TEAM, UserRole.LIFELINE_LEADER]
        const requiresPhone = userRoles.some((r: UserRole) => privilegedRoles.includes(r))
        if (requiresPhone && !cellPhone) {
          return createErrorResponse('Cell phone is required for Leader, Formation Support, and Admin roles', 400)
        }

        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            displayName: displayName || null,
            cellPhone: cellPhone ? normalizePhone(cellPhone) : null,
            roles: userRoles,
            isActive: true,
          },
          select: {
            id: true,
            email: true,
            displayName: true,
            roles: true,
            isActive: true,
            createdAt: true,
          }
        })

        // Send welcome confirmation email
        try {
          await sendUserRegistrationConfirmationEmail({
            email: user.email,
            displayName: user.displayName || user.email,
            role: user.roles[0] || UserRole.MEMBER
          })
        } catch (emailError) {
          console.error('Failed to send registration confirmation email:', emailError)
          // Don't fail the registration if email fails
        }

        return createSuccessResponse(user, 'User registered successfully')
      } catch (error) {
        console.error('Error registering user:', error)
        return createErrorResponse('Failed to register user', 500)
      }
    }
  )(req)
}, [UserRole.ADMIN])
