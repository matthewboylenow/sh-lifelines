import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { ExportData } from '@/components/dashboard/export-data'
import { UserRole } from '@prisma/client'

export default async function ExportDataPage() {
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
          <h1 className="text-3xl font-bold text-gray-900">Export Data</h1>
          <p className="text-gray-600 mt-2">
            Export LifeLines, members, and other data to CSV format for analysis and reporting.
          </p>
        </div>
        
        <ExportData userRole={session.user.role} />
      </div>
    </MainLayout>
  )
}