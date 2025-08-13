'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  FileText, 
  MessageSquare, 
  HeadphonesIcon, 
  Vote, 
  CheckCircle, 
  XCircle,
  Clock,
  Users,
  Download
} from 'lucide-react'
import { UserRole } from '@prisma/client'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/Button'

interface DashboardStats {
  pendingFormationRequests: number
  openSupportTickets: number
  totalInquiries: number
  totalLifeLines: number
}

interface FormationSupportDashboardProps {
  userId: string
  userRole: UserRole
}

export function FormationSupportDashboard({ userId, userRole }: FormationSupportDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      // In a real implementation, you'd have a stats API endpoint
      // For now, we'll use placeholder data
      setStats({
        pendingFormationRequests: 3,
        openSupportTickets: 7,
        totalInquiries: 24,
        totalLifeLines: 42,
      })
      
    } catch (error) {
      console.error('Stats error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load stats')
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
        <Button onClick={fetchStats}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {stats?.pendingFormationRequests || 0}
              </h3>
              <p className="text-sm text-gray-600">Pending Formation Requests</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-lg">
              <HeadphonesIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {stats?.openSupportTickets || 0}
              </h3>
              <p className="text-sm text-gray-600">Open Support Tickets</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {stats?.totalInquiries || 0}
              </h3>
              <p className="text-sm text-gray-600">Total Inquiries</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {stats?.totalLifeLines || 0}
              </h3>
              <p className="text-sm text-gray-600">Active LifeLines</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link 
            href="/dashboard/formation-support/formation-requests" 
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Vote className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Formation Requests</h3>
              <p className="text-sm text-gray-600">Review and vote on new group requests</p>
            </div>
          </Link>

          <Link 
            href="/dashboard/formation-support/support-tickets" 
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HeadphonesIcon className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Support Tickets</h3>
              <p className="text-sm text-gray-600">Handle support requests and issues</p>
            </div>
          </Link>

          <Link 
            href="/dashboard/formation-support/inquiries" 
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">LifeLine Inquiries</h3>
              <p className="text-sm text-gray-600">View and manage member inquiries</p>
            </div>
          </Link>

          <Link 
            href="/lifelines" 
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">All LifeLines</h3>
              <p className="text-sm text-gray-600">View all groups and their status</p>
            </div>
          </Link>

          <Link 
            href="/dashboard/formation-support/export" 
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-6 w-6 text-secondary-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Export Data</h3>
              <p className="text-sm text-gray-600">Download CSV reports</p>
            </div>
          </Link>

          <Link 
            href="/resources" 
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-6 w-6 text-purple-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Resources</h3>
              <p className="text-sm text-gray-600">Manage leader and member resources</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="dashboard-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Tips</h3>
        <ul className="space-y-3 text-sm text-gray-600">
          <li className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-gray-900">Formation Requests</strong> require at least two approvals. 
              If no objections, they auto-approve in 48 hours.
            </div>
          </li>
          <li className="flex items-start">
            <HeadphonesIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-gray-900">Support Tickets</strong> are grouped by priority—aim 
              to respond to high-priority tickets first.
            </div>
          </li>
          <li className="flex items-start">
            <MessageSquare className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-gray-900">LifeLine Inquiries</strong> help you track who's 
              interested in joining or learning more about a LifeLine.
            </div>
          </li>
          <li className="flex items-start">
            <FileText className="h-5 w-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              If you need help or have suggestions, contact the admin team at{' '}
              <Link href="mailto:admin@sainthelen.org" className="text-primary-600 hover:text-primary-700">
                <strong>admin@sainthelen.org</strong>
              </Link>.
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}