import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { InquiryTrackingDashboard } from '@/components/dashboard/inquiry-tracking-dashboard'
import { UserRole } from '@prisma/client'

export default async function InquiryTrackingPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only allow admin and formation support team
  const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.FORMATION_SUPPORT_TEAM]
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    redirect('/dashboard/leader')
  }

  return (
    <MainLayout>
      <div className="container-responsive py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inquiry Tracking</h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage all LifeLine join requests across the parish
          </p>
        </div>

        <InquiryTrackingDashboard />
      </div>
    </MainLayout>
  )
}
