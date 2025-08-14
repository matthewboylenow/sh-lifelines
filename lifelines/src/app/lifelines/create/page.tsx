import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { LifeLineForm } from '@/components/lifelines/lifeline-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function CreateLifeLinePage() {
  const session = await getServerSession(authOptions)

  // Check if user is authenticated and has permission to create LifeLines
  if (!session || !['ADMIN', 'FORMATION_SUPPORT'].includes(session.user.role)) {
    redirect('/login')
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8">
        <div className="container-responsive">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/dashboard/admin" 
              className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
            
            <h1 className="text-3xl font-bold text-primary-900 mb-2">
              Create New LifeLine
            </h1>
            <p className="text-gray-600">
              Fill out the form below to create a new LifeLine for your community.
            </p>
          </div>

          {/* Form */}
          <LifeLineForm mode="create" />
        </div>
      </div>
    </MainLayout>
  )
}

export async function generateMetadata() {
  return {
    title: 'Create New LifeLine | LifeLines',
    description: 'Create a new LifeLine for your community',
  }
}