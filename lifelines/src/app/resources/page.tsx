import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { LifeLineResources } from '@/components/resources/lifeline-resources'
import { SmallGroupResources } from '@/components/resources/small-group-resources'
import { getPublicResources } from '@/lib/public-resources'
import { UserRole } from '@prisma/client'
import { hasAnyRole } from '@/lib/auth-utils'

export const metadata = {
  title: 'Small group resources | LifeLines at Saint Helen',
  description: "This season's small group discussion guide and online resources, open to everyone.",
}

/**
 * Resources: open to everyone.
 *
 * Anyone sees the small group resources an admin has made public. Leaders and
 * staff also see the full leader resources underneath, as they did before this
 * page was opened up.
 */
export default async function ResourcesPage() {
  const [session, resources] = await Promise.all([
    getServerSession(authOptions),
    getPublicResources(),
  ])

  const leaderRoles: UserRole[] = [UserRole.LIFELINE_LEADER, UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN]
  const isLeader = Boolean(session && hasAnyRole(session.user.roles, leaderRoles))

  return (
    <MainLayout>
      <div className="container-responsive">
        <SmallGroupResources resources={resources} />

        {isLeader && session && (
          <section aria-labelledby="leader-resources" className="mt-14 md:mt-20 border-t border-gray-200 pt-10 md:pt-14">
            <div className="mb-8">
              <h2 id="leader-resources" className="text-2xl md:text-3xl font-bold text-gray-900">
                For LifeLine leaders
              </h2>
              <p className="text-gray-600 mt-2">
                Training materials, guides, and resources for leading your LifeLine.
              </p>
            </div>

            <LifeLineResources userRoles={session.user.roles} />
          </section>
        )}
      </div>
    </MainLayout>
  )
}
