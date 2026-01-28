import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MainLayout } from '@/components/layout/main-layout'
import { LifeLineForm } from '@/components/lifelines/lifeline-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

async function getLifeLineForEdit(id: string, userId: string, userRole: string) {
  try {
    const lifeLine = await prisma.lifeLine.findUnique({
      where: { id },
      include: {
        leader: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        }
      }
    })

    if (!lifeLine) {
      return null
    }

    // Check permissions - only admin, formation support, or the leader can edit
    if (userRole !== 'ADMIN' &&
        userRole !== 'FORMATION_SUPPORT_TEAM' &&
        lifeLine.leaderId !== userId) {
      return null
    }

    return lifeLine
  } catch (error) {
    console.error('Error fetching LifeLine for edit:', error)
    return null
  }
}

export default async function EditLifeLinePage({ params }: PageProps) {
  const resolvedParams = await params
  const session = await getServerSession(authOptions)

  // Check authentication
  if (!session) {
    redirect('/login')
  }

  const lifeLine = await getLifeLineForEdit(resolvedParams.id, session.user.id, session.user.role)

  if (!lifeLine) {
    notFound()
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8">
        <div className="container-responsive">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Link 
                href={`/lifelines/${resolvedParams.id}`}
                className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to LifeLine
              </Link>
              
              <Link
                href={`/lifelines/${resolvedParams.id}`}
                className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                View Public Page →
              </Link>
            </div>
            
            <h1 className="text-3xl font-bold text-primary-900 mb-2">
              Edit LifeLine
            </h1>
            <p className="text-gray-600">
              Update the details for "{lifeLine.title}"
            </p>
          </div>

          {/* Form */}
          <LifeLineForm 
            mode="edit" 
            initialData={lifeLine as any}
          />
        </div>
      </div>
    </MainLayout>
  )
}

export async function generateMetadata({ params }: PageProps) {
  try {
    const resolvedParams = await params
    const lifeLine = await prisma.lifeLine.findUnique({
      where: { id: resolvedParams.id },
      select: { title: true }
    })

    if (!lifeLine) {
      return {
        title: 'LifeLine Not Found',
      }
    }

    return {
      title: `Edit ${lifeLine.title} | LifeLines`,
      description: `Edit the ${lifeLine.title} LifeLine`,
    }
  } catch (error) {
    return {
      title: 'Edit LifeLine | LifeLines',
    }
  }
}