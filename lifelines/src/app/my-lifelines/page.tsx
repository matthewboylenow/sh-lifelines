import { Suspense } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { MemberPortal } from '@/components/member-portal/member-portal'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export const metadata = {
  title: 'Manage My LifeLines | Saint Helen',
  description: 'View the LifeLines you are part of and update your membership.',
}

export default function MyLifeLinesPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Manage My LifeLines</h1>
            <p className="mt-2 text-gray-600">
              See the LifeLines you&rsquo;re part of and update your membership.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            }
          >
            <MemberPortal />
          </Suspense>
        </div>
      </div>
    </MainLayout>
  )
}
