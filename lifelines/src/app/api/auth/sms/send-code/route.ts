import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { generateVerificationCode, sendVerificationCode, normalizePhone } from '@/lib/sms'
import bcrypt from 'bcryptjs'

// POST /api/auth/sms/send-code - Send a 6-digit verification code via SMS
export async function POST(req: NextRequest) {
  try {
    const { cellPhone } = await req.json()

    if (!cellPhone || typeof cellPhone !== 'string') {
      return createErrorResponse('Cell phone number is required', 400)
    }

    const normalized = normalizePhone(cellPhone)

    // Find user by cell phone
    const user = await prisma.user.findFirst({
      where: {
        cellPhone: normalized,
        isActive: true,
      },
      select: { id: true, cellPhone: true, displayName: true, smsCodeExpiry: true }
    })

    if (!user) {
      // Don't reveal whether the phone number exists
      return createSuccessResponse(
        { sent: true },
        'If this number is registered, a verification code has been sent.'
      )
    }

    // Server-side resend cooldown: codes are issued with a 10-minute expiry, so
    // an unexpired code with more than 9 minutes remaining was sent < 60s ago.
    // Silently skip re-sending to prevent SMS-bombing while preserving the
    // privacy-preserving generic response above.
    const COOLDOWN_MS = 60 * 1000
    const CODE_TTL_MS = 10 * 60 * 1000
    if (
      user.smsCodeExpiry &&
      user.smsCodeExpiry.getTime() - Date.now() > CODE_TTL_MS - COOLDOWN_MS
    ) {
      return createSuccessResponse(
        { sent: true },
        'If this number is registered, a verification code has been sent.'
      )
    }

    // Generate 6-digit code and hash it for storage
    const code = generateVerificationCode()
    const hashedCode = await bcrypt.hash(code, 10)

    // Store hashed code with 10-minute expiry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        smsVerificationCode: hashedCode,
        smsCodeExpiry: new Date(Date.now() + 10 * 60 * 1000),
      }
    })

    // Send the code via Twilio
    const result = await sendVerificationCode(normalized, code)

    if (!result.success) {
      console.error('SMS send failed for user:', user.id, result.error)
      return createErrorResponse('Failed to send verification code. Please try again.', 500)
    }

    return createSuccessResponse(
      { sent: true },
      'If this number is registered, a verification code has been sent.'
    )
  } catch (error) {
    console.error('SMS send-code error:', error)
    return createErrorResponse('An error occurred', 500)
  }
}
