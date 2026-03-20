import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { LeaderDashboard } from '@/components/dashboard/leader-dashboard'
import { UserRole } from '@prisma/client'
import { hasAnyRole } from '@/lib/auth-utils'

export default async function LeaderDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Check if user has leader access
  const allowedRoles: UserRole[] = [UserRole.LIFELINE_LEADER, UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN]
  if (!hasAnyRole(session.user.role, allowedRoles)) {
    redirect('/')
  }

  return (
    <MainLayout>
      <div className="container-responsive py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Leader Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage your LifeLines, track inquiries, and access leader resources.
          </p>
        </div>
        
        <LeaderDashboard userId={session.user.id} userRole={session.user.role} />
      </div>
    </MainLayout>
  )
}