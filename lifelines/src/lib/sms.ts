import twilio from 'twilio'

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

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.startsWith('+')) return phone.replace(/\s/g, '')
  return `+${digits}`
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
