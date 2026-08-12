import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { prisma } from './prisma'

/** How long a sign-in link stays valid. */
export const PORTAL_TOKEN_TTL_MINUTES = 60

/** Minimum gap between link requests for the same address. */
export const PORTAL_REQUEST_COOLDOWN_SECONDS = 60

/**
 * Reasons offered when leaving a LifeLine. Kept short and non-judgemental —
 * the point is to give the parish a usable signal, not to interrogate anyone.
 */
export const LEAVE_REASONS = [
  'The meeting time no longer works for me',
  'I have moved or am no longer in the area',
  'The group was not the right fit',
  'Health or family reasons',
  'I am joining a different LifeLine',
  'Prefer not to say',
  'Other',
] as const

export type LeaveReason = (typeof LEAVE_REASONS)[number]

/** Emails are matched case-insensitively and stored as entered elsewhere. */
export function normalizePortalEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function hashPortalToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Issue a portal sign-in link. Returns the raw token, which is only ever sent
 * to the address on file — it is never stored or logged.
 */
export function generatePortalToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * True when a link was issued to this address very recently. Used to avoid
 * mailbox flooding without revealing whether the address exists.
 */
export async function isWithinRequestCooldown(email: string): Promise<boolean> {
  const recent = await prisma.memberPortalToken.findFirst({
    where: {
      email,
      createdAt: { gt: new Date(Date.now() - PORTAL_REQUEST_COOLDOWN_SECONDS * 1000) },
    },
    select: { id: true },
  })
  return recent !== null
}

export interface PortalSession {
  email: string
  tokenId: string
}

/**
 * Validate a raw token from a link. Returns the session or null.
 *
 * Tokens stay usable until they expire rather than being consumed on first use,
 * so someone can leave more than one group, or reopen the link from the same
 * email, without needing a fresh link each time.
 */
export async function verifyPortalToken(rawToken: string): Promise<PortalSession | null> {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 32) {
    return null
  }

  const tokenHash = hashPortalToken(rawToken)

  const record = await prisma.memberPortalToken.findUnique({
    where: { tokenHash },
    select: { id: true, email: true, expiresAt: true, tokenHash: true },
  })

  if (!record) {
    return null
  }

  // Constant-time compare on the hash as defence in depth; the unique lookup
  // above already matched, so this guards against any future non-unique path.
  const provided = Buffer.from(tokenHash)
  const stored = Buffer.from(record.tokenHash)
  if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
    return null
  }

  if (record.expiresAt < new Date()) {
    return null
  }

  return { email: record.email, tokenId: record.id }
}

/**
 * The LifeLines a member is currently part of, or waiting to hear about.
 * Statuses that represent a finished relationship (NOT_JOINED, REMOVED, LEFT)
 * are excluded — there is nothing left to manage.
 */
export async function getMemberships(email: string) {
  return prisma.inquiry.findMany({
    where: {
      personEmail: { equals: email, mode: 'insensitive' },
      status: { in: ['JOINED', 'UNDECIDED'] },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      joinedAt: true,
      lifeLine: {
        select: {
          id: true,
          slug: true,
          title: true,
          meetingTime: true,
          dayOfWeek: true,
          meetingFrequency: true,
          location: true,
          groupLeader: true,
          leader: { select: { displayName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}
