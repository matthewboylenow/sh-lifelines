'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Headphones, 
  Search, 
  Filter, 
  Eye, 
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Plus,
  User,
  Calendar,
  Hash
} from 'lucide-react'
import { UserRole, TicketStatus, TicketPriority } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface SupportTicket {
  id: string
  referenceNumber: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  ticketType?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  requester: {
    id: string
    displayName: string
    email: string
  }
  responses: Array<{
    id: string
    content: string
    isFromSupport: boolean
    author: {
      id: string
      displayName: string
      email: string
    }
    createdAt: string
  }>
  _count: {
    responses: number
  }
}

export default function SupportTicketsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'ALL'>('ALL')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  const isSupport = session?.user?.role === UserRole.FORMATION_SUPPORT_TEAM || session?.user?.role === UserRole.ADMIN

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    
    if (status === 'authenticated' && session?.user) {
      fetchTickets()
    }
  }, [status, session, router, searchTerm, statusFilter, priorityFilter, pagination.page])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter)
      
      // If not support staff, only show own tickets
      if (!isSupport) {
        params.append('requesterId', session?.user?.id || '')
      }

      const response = await fetch(`/api/support-tickets?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setTickets(data.data.items || [])
        setPagination(prev => ({
          ...prev,
          total: data.data.total || 0,
          totalPages: data.data.totalPages || 0
        }))
      } else {
        setError(data.error || 'Failed to load support tickets')
      }
    } catch (error) {
      setError('Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: TicketStatus) => {
    const styles = {
      PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
      RESOLVED: 'bg-green-100 text-green-800 border-green-200'
    }
    return styles[status] || styles.PENDING_REVIEW
  }

  const getPriorityBadge = (priority: TicketPriority) => {
    const styles = {
      LOW: 'bg-gray-100 text-gray-800 border-gray-200',
      MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      URGENT: 'bg-red-100 text-red-800 border-red-200'
    }
    return styles[priority] || styles.MEDIUM
  }

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'PENDING_REVIEW': return <Clock className="h-4 w-4" />
      case 'IN_PROGRESS': return <MessageSquare className="h-4 w-4" />
      case 'RESOLVED': return <CheckCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getPriorityIcon = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.HIGH: return <AlertTriangle className="h-4 w-4" />
      case TicketPriority.MEDIUM: return <AlertTriangle className="h-4 w-4" />
      default: return null
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
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
                <Headphones className="h-8 w-8 mr-3" />
                Support Tickets
              </h1>
              <p className="text-gray-600">
                {isSupport ? 'Manage and respond to user support requests' : 'Your support tickets and requests'}
              </p>
            </div>
            <div className="flex space-x-3">
              <Button onClick={fetchTickets} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Link href="/dashboard/formation-support/support-tickets/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Ticket
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search tickets..."
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
                onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'ALL')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'ALL')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                  setPriorityFilter('ALL')
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

        {/* Tickets List */}
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-12 text-center">
              <Headphones className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Support Tickets</h3>
              <p className="text-gray-600 mb-4">
                {statusFilter !== 'ALL' || searchTerm || priorityFilter !== 'ALL'
                  ? 'No tickets match your current filters.'
                  : 'No support tickets have been created yet.'
                }
              </p>
              <Link href="/dashboard/formation-support/support-tickets/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Ticket
                </Button>
              </Link>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Hash className="h-4 w-4 mr-1" />
                        {ticket.referenceNumber}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center ${getStatusBadge(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        <span className="ml-1">{ticket.status.replace('_', ' ')}</span>
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center ${getPriorityBadge(ticket.priority)}`}>
                        {getPriorityIcon(ticket.priority)}
                        <span className="ml-1">{ticket.priority}</span>
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{ticket.subject}</h3>
                    
                    <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                      {ticket.description}
                    </p>
                    
                    <div className="flex items-center text-sm text-gray-600 space-x-4">
                      {isSupport && (
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {ticket.requester.displayName}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {ticket._count.responses} response{ticket._count.responses !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Preview of Latest Response */}
                {ticket.responses.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Latest Response</span>
                      <span className="text-xs text-gray-500">
                        {new Date(ticket.responses[ticket.responses.length - 1].createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {ticket.responses[ticket.responses.length - 1].content}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    {ticket.ticketType && (
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                        {ticket.ticketType}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/formation-support/support-tickets/${ticket.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    {(ticket.status !== 'RESOLVED' && (isSupport || ticket.requester.id === session?.user?.id)) && (
                      <Link href={`/dashboard/formation-support/support-tickets/${ticket.id}#respond`}>
                        <Button size="sm">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Respond
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
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