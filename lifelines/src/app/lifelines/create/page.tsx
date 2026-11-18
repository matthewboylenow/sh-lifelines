import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { LifeLineForm } from '@/components/lifelines/lifeline-form'
import { UserRole } from '@prisma/client'
import { hasAnyRole } from '@/lib/auth-utils'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ legacy?: string }>
}

export default async function CreateLifeLinePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)

  // Check if user is authenticated and has permission to create LifeLines
  if (!session || !hasAnyRole(session.user.roles, [UserRole.ADMIN, UserRole.FORMATION_SUPPORT_TEAM])) {
    redirect('/login')
  }

  // ?legacy=1 adds a legacy small group: admins only, never public.
  const { legacy } = await searchParams
  const isLegacy = legacy === '1'
  if (isLegacy && !hasAnyRole(session.user.roles, [UserRole.ADMIN])) {
    redirect('/dashboard/admin')
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8">
        <div className="container-responsive">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={isLegacy ? '/dashboard/admin?tab=legacy' : '/dashboard/admin'}
              className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {isLegacy ? 'Back to Legacy Small Groups' : 'Back to Dashboard'}
            </Link>

            <h1 className="text-3xl font-bold text-primary-900 mb-2">
              {isLegacy ? 'Add Legacy Small Group' : 'Create New LifeLine'}
            </h1>
            <p className="text-gray-600">
              {isLegacy
                ? "A small group from before LifeLines. It won't appear on the public site; its leaders get accounts when legacy groups are pushed live."
                : 'Fill out the form below to create a new LifeLine for your community.'}
            </p>
          </div>

          {/* Form */}
          <LifeLineForm mode="create" legacy={isLegacy} />
        </div>
      </div>
    </MainLayout>
  )
}

export async function generateMetadata({ searchParams }: PageProps) {
  const { legacy } = await searchParams
  return legacy === '1'
    ? { title: 'Add Legacy Small Group | LifeLines' }
    : {
        title: 'Create New LifeLine | LifeLines',
        description: 'Create a new LifeLine for your community',
      }
}
