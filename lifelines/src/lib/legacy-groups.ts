import crypto from 'crypto'
import { LifeLineStatus, UserRole } from '@prisma/client'
import { prisma } from './prisma'
import { hashPassword } from './auth-utils'
import { normalizeLegacyLeaders } from './legacy-leaders'

export { normalizeLegacyLeaders } from './legacy-leaders'

export interface PushLiveResult {
  published: Array<{ id: string; title: string; leaders: string[] }>
  skipped: Array<{ id: string; title: string; reason: string }>
  accountsCreated: string[]
  accountsGivenLeaderRole: string[]
}

/**
 * Push every legacy small group still in draft live.
 *
 * For each group: give each of its carried-over leaders an account (creating
 * one, or adding the leader role to an existing one), link them as the group's
 * leaders, and mark it live. Live means leaders can see and manage it from
 * their dashboard. It stays hidden from the public site; the database refuses
 * anything else.
 *
 * No email is sent. New accounts get an unguessable password and sign in
 * through the usual setup email, sent from User Management when the parish is
 * ready.
 */
export async function pushLegacyGroupsLive(): Promise<PushLiveResult> {
  const drafts = await prisma.lifeLine.findMany({
    where: { isLegacy: true, status: LifeLineStatus.DRAFT },
    select: { id: true, title: true, legacyLeaders: true, groupLeader: true, leaderEmail: true },
    orderBy: { title: 'asc' },
  })

  const result: PushLiveResult = {
    published: [],
    skipped: [],
    accountsCreated: [],
    accountsGivenLeaderRole: [],
  }

  for (const group of drafts) {
    const leaders = normalizeLegacyLeaders(group.legacyLeaders)
    if (leaders.length === 0) {
      result.skipped.push({
        id: group.id,
        title: group.title,
        reason: 'No leader with an email address. Add one, then push again.',
      })
      continue
    }

    try {
      const leaderIds: string[] = []
      for (const leader of leaders) {
        const existing = await prisma.user.findFirst({
          where: { email: { equals: leader.email, mode: 'insensitive' } },
          select: { id: true, roles: true, email: true },
        })

        if (existing) {
          if (!existing.roles.includes(UserRole.LIFELINE_LEADER)) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { roles: [...existing.roles, UserRole.LIFELINE_LEADER] },
            })
            result.accountsGivenLeaderRole.push(existing.email)
          }
          leaderIds.push(existing.id)
        } else {
          const created = await prisma.user.create({
            data: {
              email: leader.email,
              displayName: leader.name && leader.name !== leader.email ? leader.name : null,
              // Never used: they choose their own through the setup email.
              password: await hashPassword(crypto.randomBytes(24).toString('base64url')),
              roles: [UserRole.LIFELINE_LEADER],
              isActive: true,
            },
            select: { id: true, email: true },
          })
          result.accountsCreated.push(created.email)
          leaderIds.push(created.id)
        }
      }

      await prisma.lifeLine.update({
        where: { id: group.id },
        data: {
          status: LifeLineStatus.PUBLISHED,
          isVisible: false,
          leaders: { connect: leaderIds.map(id => ({ id })) },
          groupLeader: group.groupLeader || leaders.map(l => l.name).join(' and '),
          leaderEmail: group.leaderEmail || leaders[0].email,
        },
      })

      result.published.push({ id: group.id, title: group.title, leaders: leaders.map(l => l.email) })
    } catch (error) {
      console.error(`Could not push legacy group ${group.id} live:`, error)
      result.skipped.push({ id: group.id, title: group.title, reason: 'Something went wrong; try again.' })
    }
  }

  return result
}
