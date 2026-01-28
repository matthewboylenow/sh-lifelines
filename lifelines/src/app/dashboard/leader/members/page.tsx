import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { LeaderMembersView } from '@/components/dashboard/leader-members-view'
import { UserRole } from '@prisma/client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function LeaderMembersPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Allow leaders, formation support, and admins
  const allowedRoles: UserRole[] = [
    UserRole.LIFELINE_LEADER,
    UserRole.FORMATION_SUPPORT_TEAM,
    UserRole.ADMIN
  ]

  if (!allowedRoles.includes(session.user.role as UserRole)) {
    redirect('/dashboard')
  }

  return (
    <MainLayout>
      <div className="container-responsive py-8">
        <div className="mb-6">
          <Link
            href="/dashboard/leader"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold text-gray-900">My Members</h1>
          <p className="text-gray-600 mt-2">
            View and manage people who have joined your LifeLines
          </p>
        </div>

        <LeaderMembersView userId={session.user.id} userRole={session.user.role as UserRole} />
      </div>
    </MainLayout>
  )
}
