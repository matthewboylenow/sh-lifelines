'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Users, MessageSquare, BookOpen, Eye, Edit, Trash2 } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { LifeLineWithLeader, InquiryWithLifeLine } from '@/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/Button'
import { formatDate, formatInquiryStatus } from '@/utils/formatters'

interface LeaderDashboardProps {
  userId: string
  userRole: UserRole
}

export function LeaderDashboard({ userId, userRole }: LeaderDashboardProps) {
  const [lifeLines, setLifeLines] = useState<LifeLineWithLeader[]>([])
  const [recentInquiries, setRecentInquiries] = useState<InquiryWithLifeLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [userId])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch user's LifeLines
      const lifelinesRes = await fetch(`/api/lifelines?leaderId=${userId}`)
      const lifelinesData = await lifelinesRes.json()
      
      if (!lifelinesRes.ok) {
        throw new Error(lifelinesData.error || 'Failed to fetch LifeLines')
      }
      
      setLifeLines(lifelinesData.data.items || [])

      // Fetch recent inquiries for user's LifeLines
      if (lifelinesData.data.items.length > 0) {
        const inquiriesRes = await fetch('/api/inquiries?recent=true&limit=5')
        const inquiriesData = await inquiriesRes.json()
        
        if (inquiriesRes.ok) {
          setRecentInquiries(inquiriesData.data.items || [])
        }
      }
      
    } catch (error) {
      console.error('Dashboard error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p>Error loading dashboard: {error}</p>
        </div>
        <Button onClick={fetchDashboardData}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/lifelines/create" className="dashboard-card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="bg-primary-100 p-3 rounded-lg">
              <Plus className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">Create LifeLine</h3>
              <p className="text-sm text-gray-600">Start a new group</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/leader/inquiries" className="dashboard-card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="bg-secondary-100 p-3 rounded-lg">
              <MessageSquare className="h-6 w-6 text-secondary-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">View Inquiries</h3>
              <p className="text-sm text-gray-600">Manage member inquiries</p>
            </div>
          </div>
        </Link>

        <Link href="/resources" className="dashboard-card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">LifeLine Resources</h3>
              <p className="text-sm text-gray-600">Access leader resources</p>
            </div>
          </div>
        </Link>

        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">
                {lifeLines.length} LifeLine{lifeLines.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-gray-600">Groups you lead</p>
            </div>
          </div>
        </div>
      </div>

      {/* My LifeLines */}
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">My LifeLines</h2>
          <Link href="/lifelines/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </Link>
        </div>

        {lifeLines.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No LifeLines yet</h3>
            <p className="text-gray-600 mb-4">Create your first LifeLine to get started.</p>
            <Link href="/lifelines/create">
              <Button>
                Create LifeLine
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {lifeLines.map((lifeLine) => (
              <div key={lifeLine.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{lifeLine.title}</h3>
                    <span className={`status-badge ${
                      lifeLine.status === 'PUBLISHED' 
                        ? 'status-badge-published' 
                        : lifeLine.status === 'FULL'
                        ? 'status-badge-full'
                        : lifeLine.status === 'DRAFT'
                        ? 'status-badge-draft'
                        : 'status-badge-archived'
                    }`}>
                      {lifeLine.status.toLowerCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/lifelines/${lifeLine.id}`}
                      className="text-gray-400 hover:text-gray-600"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/lifelines/${lifeLine.id}/edit`}
                      className="text-gray-400 hover:text-gray-600"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    {(userRole === UserRole.ADMIN || userRole === UserRole.FORMATION_SUPPORT_TEAM) && (
                      <button
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this LifeLine?')) {
                            // Handle delete
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {lifeLine.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {lifeLine.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {lifeLine._count?.inquiries || 0} inquir{lifeLine._count?.inquiries === 1 ? 'y' : 'ies'}
                  </span>
                  <span>
                    Created {formatDate(lifeLine.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Inquiries */}
      {recentInquiries.length > 0 && (
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Inquiries</h2>
            <Link href="/dashboard/leader/inquiries">
              <Button variant="outline">
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {recentInquiries.map((inquiry) => (
              <div key={inquiry.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{inquiry.personName}</h4>
                  <p className="text-sm text-gray-600">{inquiry.lifeLine.title}</p>
                  {inquiry.message && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{inquiry.message}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`status-badge ${
                    inquiry.status === 'JOINED' 
                      ? 'status-badge-joined'
                      : inquiry.status === 'NOT_JOINED'
                      ? 'status-badge-not-joined'
                      : 'status-badge-undecided'
                  }`}>
                    {formatInquiryStatus(inquiry.status)}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(inquiry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}