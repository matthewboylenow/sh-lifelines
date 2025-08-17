import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { AdminSettings } from '@/components/dashboard/admin-settings'
import { UserRole } from '@prisma/client'

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Check if user has admin access
  if (session.user.role !== UserRole.ADMIN) {
    redirect('/')
  }

  return (
    <MainLayout>
      <div className="container-responsive py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure system settings, email templates, and integrations.
          </p>
        </div>
        
        <AdminSettings />
      </div>
    </MainLayout>
  )
}