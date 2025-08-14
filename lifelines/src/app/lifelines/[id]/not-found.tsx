import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/Button'

export default function LifeLineNotFound() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-4">
          {/* Icon */}
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Search className="h-12 w-12 text-gray-400" />
          </div>
          
          {/* Content */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            LifeLine Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            The LifeLine you're looking for doesn't exist or is no longer available.
          </p>
          
          {/* Actions */}
          <div className="space-y-4">
            <Link href="/">
              <Button size="lg" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Browse All LifeLines
              </Button>
            </Link>
            
            <p className="text-sm text-gray-500">
              Can't find what you're looking for? Contact us for help.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}