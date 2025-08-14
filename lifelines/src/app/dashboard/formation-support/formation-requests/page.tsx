'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Vote,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  User,
  Mail,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'
import { UserRole, FormationStatus, GroupType } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface FormationRequest {
  id: string
  title: string
  description?: string
  status: FormationStatus
  groupLeader: string
  leaderEmail: string
  cellPhone?: string
  agesStages?: string
  groupType?: GroupType
  meetingFrequency?: string
  dayOfWeek?: string
  meetingTime?: string
  autoApprovalScheduled?: string
  lifeLineCreated: boolean
  createdAt: string
  submitter?: {
    id: string
    displayName: string
    email: string
  }
  votes: Array<{
    id: string
    vote: 'APPROVE' | 'PASS' | 'OBJECT' | 'DISCUSS'
    comment?: string
    user: {
      id: string
      displayName: string
      email: string
    }
    createdAt: string
  }>
  comments: Array<{
    id: string
    content: string
    author: {
      id: string
      displayName: string
      email: string
    }
    createdAt: string
  }>
}

export default function FormationRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [requests, setRequests] = useState<FormationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<FormationStatus | 'ALL'>('ALL')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    
    if (status === 'authenticated') {
      if (!session?.user || 
          (session.user.role !== UserRole.FORMATION_SUPPORT_TEAM && 
           session.user.role !== UserRole.ADMIN)) {
        router.push('/dashboard/leader')
        return
      }
      fetchRequests()
    }
  }, [status, session, router, searchTerm, statusFilter, pagination.page])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)

      const response = await fetch(`/api/formation-requests?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setRequests(data.data.items || [])
        setPagination(prev => ({
          ...prev,
          total: data.data.total || 0,
          totalPages: data.data.totalPages || 0
        }))
      } else {
        setError(data.error || 'Failed to load formation requests')
      }
    } catch (error) {
      setError('Failed to load formation requests')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: FormationStatus) => {
    const styles = {
      SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      ARCHIVED: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return styles[status] || styles.SUBMITTED
  }

  const getVoteSummary = (votes: FormationRequest['votes']) => {
    const summary = votes.reduce(
      (acc, vote) => {
        acc[vote.vote] = (acc[vote.vote] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    return summary
  }

  const formatTimeRemaining = (scheduledDate?: string) => {
    if (!scheduledDate) return null
    
    const now = new Date()
    const scheduled = new Date(scheduledDate)
    const diff = scheduled.getTime() - now.getTime()
    
    if (diff <= 0) return 'Overdue'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 24) {
      return `${hours}h remaining`
    }
    
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h remaining`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/formation-support" className="flex items-center text-primary hover:text-primary-dark">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FileText className="h-8 w-8 mr-3" />
                Formation Requests
              </h1>
              <p className="text-gray-600">Review and vote on new LifeLine formation requests</p>
            </div>
            <Button onClick={fetchRequests} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FormationStatus | 'ALL')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Requests List */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Formation Requests</h3>
              <p className="text-gray-600">
                {statusFilter !== 'ALL' || searchTerm 
                  ? 'No requests match your current filters.'
                  : 'No formation requests have been submitted yet.'
                }
              </p>
            </div>
          ) : (
            requests.map((request) => {
              const voteSummary = getVoteSummary(request.votes)
              const timeRemaining = formatTimeRemaining(request.autoApprovalScheduled)
              
              return (
                <div key={request.id} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                        {request.lifeLineCreated && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            LifeLine Created
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600 space-x-4 mb-2">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {request.groupLeader}
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {request.leaderEmail}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {request.description && (
                        <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                          {request.description}
                        </p>
                      )}

                      {/* Meeting Details */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {request.groupType && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                            {request.groupType}
                          </span>
                        )}
                        {request.agesStages && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                            {request.agesStages}
                          </span>
                        )}
                        {request.meetingFrequency && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                            {request.meetingFrequency}
                          </span>
                        )}
                        {request.dayOfWeek && request.meetingTime && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                            {request.dayOfWeek}s at {request.meetingTime}
                          </span>
                        )}
                      </div>

                      {/* Auto-approval Timer */}
                      {request.status === 'SUBMITTED' && timeRemaining && (
                        <div className="flex items-center text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg mb-3">
                          <Clock className="h-4 w-4 mr-2" />
                          Auto-approval: {timeRemaining}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Voting Summary */}
                  {request.votes.length > 0 && (
                    <div className="flex items-center space-x-4 mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700">Votes:</div>
                      {voteSummary.APPROVE && (
                        <div className="flex items-center text-green-700">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {voteSummary.APPROVE} Approve
                        </div>
                      )}
                      {voteSummary.OBJECT && (
                        <div className="flex items-center text-red-700">
                          <XCircle className="h-4 w-4 mr-1" />
                          {voteSummary.OBJECT} Object
                        </div>
                      )}
                      {voteSummary.DISCUSS && (
                        <div className="flex items-center text-yellow-700">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {voteSummary.DISCUSS} Discuss
                        </div>
                      )}
                      {voteSummary.PASS && (
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-1" />
                          {voteSummary.PASS} Pass
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      {request.votes.length} vote{request.votes.length !== 1 ? 's' : ''} • {request.comments.length} comment{request.comments.length !== 1 ? 's' : ''}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/formation-support/formation-requests/${request.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </Link>
                      {request.status === 'SUBMITTED' && (
                        <Link href={`/dashboard/formation-support/formation-requests/${request.id}#vote`}>
                          <Button size="sm">
                            <Vote className="h-4 w-4 mr-2" />
                            Vote
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              
              <span className="px-4 py-2 text-sm text-gray-600 flex items-center">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}