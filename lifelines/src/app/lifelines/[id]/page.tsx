import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, Users, MapPin, Mail, Phone, ArrowLeft, Edit } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MainLayout } from '@/components/layout/main-layout'
import { InquiryForm } from '@/components/lifelines/inquiry-form'
import { prisma } from '@/lib/prisma'
import { LifeLineWithLeader } from '@/types'
import { formatGroupType, formatMeetingFrequency, formatDayOfWeek } from '@/utils/formatters'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

async function getLifeLine(id: string): Promise<LifeLineWithLeader | null> {
  try {
    const lifeLine = await prisma.lifeLine.findUnique({
      where: {
        id: id,
        status: 'PUBLISHED', // Only show published LifeLines to public
        isVisible: true, // Only show visible LifeLines
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        inquiries: {
          select: {
            id: true,
            status: true,
          }
        }
      }
    })

    if (!lifeLine) {
      return null
    }

    return {
      ...lifeLine,
      groupLeader: lifeLine.leader?.name || lifeLine.groupLeader || 'TBD'
    }
  } catch (error) {
    console.error('Error fetching LifeLine:', error)
    return null
  }
}

export default async function LifeLineDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const lifeLine = await getLifeLine(resolvedParams.id)
  const session = await getServerSession(authOptions)

  if (!lifeLine) {
    notFound()
  }

  // Check if user can edit this LifeLine
  const canEdit = session && (
    session.user.role === 'ADMIN' || 
    session.user.role === 'FORMATION_SUPPORT' ||
    session.user.id === lifeLine.leaderId
  )

  const defaultImage = '/images/default-lifeline.jpg'
  const activeInquiries = lifeLine.inquiries?.filter(i => i.status === 'PENDING').length || 0
  const totalInquiries = lifeLine.inquiries?.length || 0

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {/* Back Navigation */}
        <div className="container-responsive pt-8 pb-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to LifeLines
            </Link>
            
            {canEdit && (
              <Link href={`/lifelines/${resolvedParams.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit LifeLine
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative h-96 bg-cover bg-center bg-no-repeat overflow-hidden"
             style={{
               backgroundImage: `linear-gradient(rgba(31, 52, 109, 0.7), rgba(31, 52, 109, 0.7)), url(${lifeLine.imageUrl || defaultImage})`
             }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="container-responsive text-center text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
                {lifeLine.title}
              </h1>
              {lifeLine.subtitle && (
                <p className="text-xl md:text-2xl text-white/90 drop-shadow-lg">
                  {lifeLine.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Status Badges */}
          <div className="absolute top-6 right-6 flex gap-2">
            {lifeLine.agesStages && lifeLine.agesStages.length > 0 && (
              <span className="bg-secondary-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                {lifeLine.agesStages[0]}
              </span>
            )}
            {lifeLine.status === 'FULL' && (
              <span className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                Full
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="container-responsive py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-primary-900 mb-6">About This LifeLine</h2>
                <div className="prose prose-lg max-w-none text-gray-700">
                  {lifeLine.description ? (
                    <div dangerouslySetInnerHTML={{ __html: lifeLine.description.replace(/\n/g, '<br>') }} />
                  ) : (
                    <p>More information about this LifeLine is coming soon.</p>
                  )}
                </div>
              </div>

              {/* Meeting Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-primary-900 mb-6">Meeting Information</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Schedule */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>
                    <div className="space-y-3">
                      {lifeLine.dayOfWeek && (
                        <div className="flex items-center text-gray-600">
                          <Calendar className="mr-3 h-5 w-5 text-primary-500" />
                          <span>{formatDayOfWeek(lifeLine.dayOfWeek)}s</span>
                        </div>
                      )}
                      {lifeLine.meetingTime && (
                        <div className="flex items-center text-gray-600">
                          <Clock className="mr-3 h-5 w-5 text-primary-500" />
                          <span>{lifeLine.meetingTime}</span>
                        </div>
                      )}
                      {lifeLine.meetingFrequency && (
                        <div className="flex items-center text-gray-600">
                          <Calendar className="mr-3 h-5 w-5 text-primary-500" />
                          <span>{formatMeetingFrequency(lifeLine.meetingFrequency)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Location</h3>
                    <div className="space-y-3">
                      {lifeLine.location && (
                        <div className="flex items-start text-gray-600">
                          <MapPin className="mr-3 h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                          <span>{lifeLine.location}</span>
                        </div>
                      )}
                      {lifeLine.groupType && (
                        <div className="flex items-center text-gray-600">
                          <Users className="mr-3 h-5 w-5 text-primary-500" />
                          <span>{formatGroupType(lifeLine.groupType)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                {(lifeLine.duration || lifeLine.childcare || lifeLine.cost) && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      {lifeLine.duration && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">Duration:</span>
                          <span className="text-gray-600 ml-2">{lifeLine.duration}</span>
                        </div>
                      )}
                      {lifeLine.childcare && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">Childcare:</span>
                          <span className="text-gray-600 ml-2">Available</span>
                        </div>
                      )}
                      {lifeLine.cost && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">Cost:</span>
                          <span className="text-gray-600 ml-2">${lifeLine.cost}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Join Interest Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-primary-900 mb-4">Interested in Joining?</h3>
                
                {lifeLine.status === 'FULL' ? (
                  <div className="text-center py-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-800 font-medium">This LifeLine is currently full.</p>
                      <p className="text-red-600 text-sm mt-1">You can still express interest to be added to the waiting list.</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 mb-4">
                    <p className="text-gray-600 text-sm">
                      Express your interest and we'll connect you with the leader.
                    </p>
                  </div>
                )}

                <InquiryForm 
                  lifeLineId={lifeLine.id}
                  lifeLineTitle={lifeLine.title}
                  isFullStatus={lifeLine.status === 'FULL'}
                />
              </div>

              {/* Leader Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-primary-900 mb-4">LifeLine Leader</h3>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-primary-600">
                      {lifeLine.groupLeader.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{lifeLine.groupLeader}</h4>
                  
                  {lifeLine.leader && (
                    <div className="space-y-2 text-sm text-gray-600">
                      {lifeLine.leader.email && (
                        <div className="flex items-center justify-center">
                          <Mail className="mr-2 h-4 w-4" />
                          <a href={`mailto:${lifeLine.leader.email}`} className="hover:text-primary-600 transition-colors">
                            {lifeLine.leader.email}
                          </a>
                        </div>
                      )}
                      {lifeLine.leader.phone && (
                        <div className="flex items-center justify-center">
                          <Phone className="mr-2 h-4 w-4" />
                          <a href={`tel:${lifeLine.leader.phone}`} className="hover:text-primary-600 transition-colors">
                            {lifeLine.leader.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-primary-900 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Interest:</span>
                    <span className="font-semibold text-primary-600">{activeInquiries} people</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Inquiries:</span>
                    <span className="font-semibold text-gray-900">{totalInquiries}</span>
                  </div>
                  {lifeLine.maxParticipants && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Max Size:</span>
                      <span className="font-semibold text-gray-900">{lifeLine.maxParticipants} people</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export async function generateStaticParams() {
  const lifeLines = await prisma.lifeLine.findMany({
    where: {
      status: 'PUBLISHED',
      isVisible: true,
    },
    select: {
      id: true,
    },
  })

  return lifeLines.map((lifeLine) => ({
    id: lifeLine.id,
  }))
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params
  const lifeLine = await getLifeLine(resolvedParams.id)

  if (!lifeLine) {
    return {
      title: 'LifeLine Not Found',
    }
  }

  return {
    title: `${lifeLine.title} | LifeLines`,
    description: lifeLine.description || `Join the ${lifeLine.title} LifeLine led by ${lifeLine.groupLeader}`,
  }
}