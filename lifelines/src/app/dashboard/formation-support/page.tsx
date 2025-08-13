import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { FormationSupportDashboard } from '@/components/dashboard/formation-support-dashboard'
import { UserRole } from '@prisma/client'

export default async function FormationSupportDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Check if user has formation/support access
  const allowedRoles: UserRole[] = [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN]
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    redirect('/')
  }

  return (
    <MainLayout>
      <div className="container-responsive py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Formation & Support Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Review formation requests, manage support tickets, and track member inquiries.
          </p>
        </div>
        
        <FormationSupportDashboard userId={session.user.id} userRole={session.user.role} />
      </div>
    </MainLayout>
  )
}