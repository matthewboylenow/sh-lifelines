import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { normalizePhone } from '@/lib/sms'
import bcrypt from 'bcryptjs'

// POST /api/auth/sms/verify-code - Verify a 6-digit SMS code (used before NextAuth signIn)
export async function POST(req: NextRequest) {
  try {
    const { cellPhone, code } = await req.json()

    if (!cellPhone || !code) {
      return createErrorResponse('Phone number and verification code are required', 400)
    }

    if (typeof code !== 'string' || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return createErrorResponse('Invalid verification code format', 400)
    }

    const normalized = normalizePhone(cellPhone)

    const user = await prisma.user.findFirst({
      where: {
        cellPhone: normalized,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        username: true,
        roles: true,
        smsVerificationCode: true,
        smsCodeExpiry: true,
      }
    })

    if (!user || !user.smsVerificationCode || !user.smsCodeExpiry) {
      return createErrorResponse('Invalid or expired verification code', 401)
    }

    // Check expiry
    if (new Date() > user.smsCodeExpiry) {
      // Clear expired code
      await prisma.user.update({
        where: { id: user.id },
        data: { smsVerificationCode: null, smsCodeExpiry: null }
      })
      return createErrorResponse('Verification code has expired. Please request a new one.', 401)
    }

    // Verify the code against hashed value
    const isValid = await bcrypt.compare(code, user.smsVerificationCode)

    if (!isValid) {
      return createErrorResponse('Invalid verification code', 401)
    }

    // Clear the code after successful verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        smsVerificationCode: null,
        smsCodeExpiry: null,
        cellPhoneVerified: true,
        lastLoginAt: new Date(),
      }
    })

    // Return user data for the client to pass to NextAuth signIn
    return createSuccessResponse({
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.displayName || user.username || user.email,
        roles: user.roles,
      }
    })
  } catch (error) {
    console.error('SMS verify-code error:', error)
    return createErrorResponse('An error occurred', 500)
  }
}
