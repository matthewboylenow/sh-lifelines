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
        </div>
      </div>
    </MainLayout>
  )
}