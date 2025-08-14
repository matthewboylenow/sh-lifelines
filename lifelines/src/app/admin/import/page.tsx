import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { WordPressImportWizard } from '@/components/admin/wordpress-import-wizard'

export default async function AdminImportPage() {
  const session = await getServerSession(authOptions)

  // Check if user is authenticated and is an admin
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8">
        <div className="container-responsive">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary-900 mb-2">
              WordPress Data Import
            </h1>
            <p className="text-gray-600">
              Import your existing LifeLines data from WordPress with Advanced Custom Fields (ACF)
            </p>
          </div>

          <WordPressImportWizard />
        </div>
      </div>
    </MainLayout>
  )
}