import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  withValidation 
} from '@/lib/api-utils'
import { z } from 'zod'
import { hashPassword, generateResetToken } from '@/lib/auth-utils'
import { sendPasswordResetEmail } from '@/lib/email'

const requestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
})

// POST /api/auth/reset-password - Request password reset
export const POST = withValidation(
  requestResetSchema,
  async (req: NextRequest, validatedData: any) => {
    const { email } = validatedData

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        // Don't reveal if email exists or not
        return createSuccessResponse(
          null, 
          'If an account with that email exists, you will receive a password reset link'
        )
      }

      // Generate reset token (expires in 1 hour)
      const resetToken = generateResetToken()
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Save reset token to user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        }
      })

      // Send password reset email
      try {
        await sendPasswordResetEmail(
          user.email,
          user.displayName || user.email,
          resetToken
        )
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError)
        return createErrorResponse('Failed to send password reset email', 500)
      }

      return createSuccessResponse(
        null, 
        'If an account with that email exists, you will receive a password reset link'
      )
    } catch (error) {
      console.error('Error requesting password reset:', error)
      return createErrorResponse('Failed to request password reset', 500)
    }
  }
)

// PUT /api/auth/reset-password - Reset password with token
export const PUT = withValidation(
  resetPasswordSchema,
  async (req: NextRequest, validatedData: any) => {
    const { token, password } = validatedData

    try {
      // Find user with valid reset token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      })

      if (!user) {
        return createErrorResponse('Invalid or expired reset token', 400)
      }

      // Hash new password
      const hashedPassword = await hashPassword(password)

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        }
      })

      return createSuccessResponse(null, 'Password reset successfully')
    } catch (error) {
      console.error('Error resetting password:', error)
      return createErrorResponse('Failed to reset password', 500)
    }
  }
)