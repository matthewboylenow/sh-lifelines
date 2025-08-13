import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MainLayout } from '@/components/layout/main-layout'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)

  // Redirect if already logged in
  if (session) {
    redirect('/dashboard/leader')
  }

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Sign in to LifeLines
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Access your dashboard and manage your groups
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <LoginForm />
          </div>

          {/* Development credentials */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Development Access</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <div><strong>Admin:</strong> admin@sainthelen.org / admin123</div>
              <div><strong>Support:</strong> support@sainthelen.org / support123</div>
              <div><strong>Leader:</strong> maria.fusillo@example.com / leader123</div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}