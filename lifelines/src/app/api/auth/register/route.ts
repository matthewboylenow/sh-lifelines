import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  withValidation 
} from '@/lib/api-utils'
import { registerSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/auth-utils'
import { UserRole } from '@prisma/client'

// POST /api/auth/register - Register new user
export const POST = withValidation(
  registerSchema,
  async (req: NextRequest, validatedData: any) => {
    const { email, password, displayName, role } = validatedData

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

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          displayName: displayName || null,
          role: role || UserRole.MEMBER,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          createdAt: true,
        }
      })

      return createSuccessResponse(user, 'User registered successfully')
    } catch (error) {
      console.error('Error registering user:', error)
      return createErrorResponse('Failed to register user', 500)
    }
  }
)