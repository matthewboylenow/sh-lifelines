import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { LifeLineResources } from '@/components/resources/lifeline-resources'
import { UserRole } from '@prisma/client'

export default async function ResourcesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Check if user has access to resources (leaders and above)
  const allowedRoles: UserRole[] = [UserRole.LIFELINE_LEADER, UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN]
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    redirect('/')
  }

  return (
    <MainLayout>
      <div className="container-responsive py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">LifeLine Resources</h1>
          <p className="text-gray-600 mt-2">
            Access training materials, guides, and resources for leading your LifeLine.
          </p>
        </div>
        
        <LifeLineResources userRole={session.user.role} />
      </div>
    </MainLayout>
  )
}