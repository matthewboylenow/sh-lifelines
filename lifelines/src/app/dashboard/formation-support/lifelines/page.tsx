import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { AllLifeLines } from '@/components/dashboard/all-lifelines'
import { UserRole } from '@prisma/client'

export default async function AllLifeLinesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Check if user has formation support access
  const allowedRoles: UserRole[] = [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN]
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    redirect('/')
  }

  return (
    <MainLayout>
      <div className="container-responsive py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All LifeLines</h1>
          <p className="text-gray-600 mt-2">
            View and manage all LifeLines across the church community.
          </p>
        </div>
        
        <AllLifeLines userRole={session.user.role} />
      </div>
    </MainLayout>
  )
}