import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { CourseView } from '@/components/training/course-view'
import { hasAnyRole } from '@/lib/auth-utils'
import { UserRole } from '@prisma/client'

export const metadata = {
  title: 'Leader Training | LifeLines',
  description: 'Training for LifeLine leaders.',
}

export default async function TrainingPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (!hasAnyRole(session.user.roles, [
    UserRole.ADMIN,
    UserRole.FORMATION_SUPPORT_TEAM,
    UserRole.LIFELINE_LEADER,
  ])) {
    redirect('/profile')
  }

  return (
    <MainLayout>
      <div className="container-responsive py-8">
        {/* The leader-training series is the only course today; when there are
            more, this becomes a list and each gets its own page. */}
        <CourseView slug="leader-training" />
      </div>
    </MainLayout>
  )
}
