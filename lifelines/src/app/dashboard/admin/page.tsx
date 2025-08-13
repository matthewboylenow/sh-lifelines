import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { UserRole } from '@prisma/client'

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  // Redirect if not logged in
  if (!session) {
    redirect('/login')
  }

  // Check if user has admin role
  const allowedRoles: UserRole[] = [UserRole.ADMIN]
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    redirect('/dashboard/leader')
  }

  return (
    <MainLayout>
      <div className="container-responsive py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage LifeLines, users, and system settings
          </p>
        </div>

        <AdminDashboard 
          userId={session.user.id} 
          userRole={session.user.role as UserRole} 
        />
      </div>
    </MainLayout>
  )
}