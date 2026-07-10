import twilio from 'twilio'
import { normalizePhone } from './phone'

// Re-exported for backward compatibility with existing importers.
export { normalizePhone }

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromPhone = process.env.TWILIO_PHONE_NUMBER

function getClient() {
  if (!accountSid || !authToken || !fromPhone) {
    throw new Error('Twilio credentials not configured')
  }
  return twilio(accountSid, authToken)
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendVerificationCode(to: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient()
    await client.messages.create({
      body: `Your LifeLines sign-in code is: ${code}. This code expires in 10 minutes.`,
      from: fromPhone,
      to: normalizePhone(to),
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to send SMS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    }
  }
}
