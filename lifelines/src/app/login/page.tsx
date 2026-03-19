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

          {/* Temporary test credentials - REMOVE BEFORE GO-LIVE */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded uppercase">Testing Only</span>
              <h3 className="text-sm font-semibold text-amber-900">Team Login Credentials</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-white rounded-md p-3 border border-amber-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Administrator</div>
                <div className="text-sm text-gray-800">
                  <span className="font-medium">Email:</span> admin@sainthelen.org<br />
                  <span className="font-medium">Password:</span> admin123
                </div>
              </div>
              <div className="bg-white rounded-md p-3 border border-amber-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Formation &amp; Support Team</div>
                <div className="text-sm text-gray-800">
                  <span className="font-medium">Email:</span> formation@sainthelen.org<br />
                  <span className="font-medium">Password:</span> support123
                </div>
              </div>
              <div className="bg-white rounded-md p-3 border border-amber-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">LifeLine Leader (Sample)</div>
                <div className="text-sm text-gray-800">
                  <span className="font-medium">Email:</span> leader1@sainthelen.org<br />
                  <span className="font-medium">Password:</span> leader123
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-700 mt-3 italic">These credentials will be removed before the site goes live.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}