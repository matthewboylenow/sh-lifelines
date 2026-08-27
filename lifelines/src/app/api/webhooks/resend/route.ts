import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

/**
 * Resend delivery events.
 *
 * Handing a message to the provider is not the same as it arriving. These
 * events are what let an admin tell a leader who never received their
 * invitation from one who received it and did nothing — which need completely
 * different follow-up.
 *
 * Configure the endpoint in the Resend dashboard and put its signing secret in
 * RESEND_WEBHOOK_SECRET.
 */

const TOLERANCE_SECONDS = 5 * 60

/**
 * Resend signs with Svix. Verified by hand rather than pulling in the library
 * for one function: HMAC-SHA256 over "<id>.<timestamp>.<body>", keyed by the
 * secret after its whsec_ prefix is stripped and the rest base64-decoded.
 */
function verify(req: NextRequest, rawBody: string, secret: string): boolean {
  const id = req.headers.get('svix-id')
  const timestamp = req.headers.get('svix-timestamp')
  const signatureHeader = req.headers.get('svix-signature')

  if (!id || !timestamp || !signatureHeader) return false

  // Reject anything old enough to be a replay.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('base64')

  // The header carries space-separated "v1,<signature>" pairs; any may match.
  return signatureHeader.split(' ').some(part => {
    const candidate = part.split(',')[1]
    if (!candidate || candidate.length !== expected.length) return false
    return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))
  })
}

/** Which column each event stamps. */
const EVENT_COLUMNS: Record<string, string | null> = {
  'email.sent': null,
  'email.delivered': 'deliveredAt',
  'email.opened': 'openedAt',
  'email.clicked': 'clickedAt',
  'email.bounced': 'bouncedAt',
  'email.complained': 'complainedAt',
  'email.delivery_delayed': null,
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET
    if (!secret) {
      console.error('RESEND_WEBHOOK_SECRET is not set — delivery events are being dropped')
      return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }

    // Signature covers the exact bytes, so verify before parsing.
    const rawBody = await req.text()
    if (!verify(req, rawBody, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody)
    const type: string = event?.type
    const providerId: string | undefined = event?.data?.email_id

    if (!type || !providerId) {
      // Nothing to attach it to; accept it so the provider stops retrying.
      return NextResponse.json({ ok: true })
    }

    const existing = await prisma.emailDelivery.findUnique({
      where: { providerId },
      select: { id: true },
    })

    if (!existing) {
      // An email we did not record, or one sent before tracking existed.
      return NextResponse.json({ ok: true })
    }

    const column = EVENT_COLUMNS[type]
    const at = event?.created_at ? new Date(event.created_at) : new Date()

    await prisma.emailDelivery.update({
      where: { providerId },
      data: {
        lastEvent: type,
        ...(column ? { [column]: at } : {}),
        ...(type === 'email.bounced'
          ? { lastError: event?.data?.reason ?? 'Bounced' }
          : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error handling Resend webhook:', error)
    // A 500 asks the provider to retry, which is right for a transient fault.
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
  }
}
