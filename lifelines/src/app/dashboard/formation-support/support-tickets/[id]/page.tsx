'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Headphones, 
  ArrowLeft,
  User,
  Calendar,
  Hash,
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  RefreshCw
} from 'lucide-react'
import { UserRole, TicketStatus, TicketPriority } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { RichTextEditor } from '@/components/ui/rich-text-editor'

interface SupportTicketDetail {
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
}

export default function SupportTicketDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const ticketId = params?.id as string
  
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [responseText, setResponseText] = useState('')
  const [newStatus, setNewStatus] = useState<TicketStatus | ''>('')

  const isSupport = session?.user?.role === UserRole.FORMATION_SUPPORT_TEAM || session?.user?.role === UserRole.ADMIN
  const canRespond = ticket && (isSupport || ticket.requester.id === session?.user?.id)
  const canUpdateStatus = isSupport

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    
    if (status === 'authenticated' && ticketId) {
      fetchTicket()
    }
  }, [status, router, ticketId])

  const fetchTicket = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/support-tickets/${ticketId}`)
      const data = await response.json()

      if (data.success) {
        setTicket(data.data)
        setNewStatus(data.data.status)
      } else {
        setError(data.error || 'Failed to load support ticket')
      }
    } catch (error) {
      setError('Failed to load support ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!responseText.trim()) return

    setResponding(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/support-tickets/${ticketId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: responseText,
          isFromSupport: isSupport
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Response added successfully')
        setResponseText('')
        // Refresh the ticket data
        await fetchTicket()
        // Scroll to bottom to show new response
        setTimeout(() => {
          const responseSection = document.getElementById('responses')
          if (responseSection) {
            responseSection.scrollTop = responseSection.scrollHeight
          }
        }, 100)
      } else {
        setError(result.error || 'Failed to add response')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setResponding(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === ticket?.status) return

    setUpdating(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/support-tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Ticket status updated successfully')
        await fetchTicket()
      } else {
        setError(result.error || 'Failed to update ticket status')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setUpdating(false)
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
      case 'URGENT': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'HIGH': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default: return null
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error && !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ticket Not Found</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link href="/dashboard/formation-support/support-tickets">
            <Button>Back to Support Tickets</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!ticket) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/formation-support/support-tickets" className="flex items-center text-primary hover:text-primary-dark">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Support Tickets
            </Link>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Hash className="h-6 w-6 text-gray-400" />
                <span className="text-lg font-mono text-gray-600">{ticket.referenceNumber}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center ${getStatusBadge(ticket.status)}`}>
                  {getStatusIcon(ticket.status)}
                  <span className="ml-1">{ticket.status.replace('_', ' ')}</span>
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center ${getPriorityBadge(ticket.priority)}`}>
                  {getPriorityIcon(ticket.priority)}
                  <span className="ml-1">{ticket.priority}</span>
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Headphones className="h-8 w-8 mr-3" />
                {ticket.subject}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {ticket.requester.displayName}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Created {new Date(ticket.createdAt).toLocaleString()}
                </div>
                {ticket.resolvedAt && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                    Resolved {new Date(ticket.resolvedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            <Button onClick={fetchTicket} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Original Description */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Original Request</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>
              {ticket.ticketType && (
                <div className="mt-4">
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {ticket.ticketType}
                  </span>
                </div>
              )}
            </div>

            {/* Responses */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Responses ({ticket.responses.length})
              </h2>
              
              <div id="responses" className="space-y-4 max-h-96 overflow-y-auto">
                {ticket.responses.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No responses yet.</p>
                ) : (
                  ticket.responses.map((response, index) => (
                    <div key={response.id} className={`p-4 rounded-lg ${
                      response.isFromSupport 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : 'bg-gray-50 border-l-4 border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            response.isFromSupport 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-500 text-white'
                          }`}>
                            {response.author.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">{response.author.displayName}</div>
                            <div className="text-xs text-gray-600">
                              {response.isFromSupport ? 'Support Team' : 'Customer'}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(response.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{response.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Response */}
            {canRespond && ticket.status !== 'RESOLVED' && (
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6" id="respond">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Response</h2>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                    {success}
                  </div>
                )}

                <form onSubmit={handleResponseSubmit} className="space-y-4">
                  <div>
                    <RichTextEditor
                      value={responseText}
                      onChange={setResponseText}
                      placeholder="Enter your response..."
                      minHeight={150}
                      maxHeight={300}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!responseText.trim() || responding}
                    className="flex items-center"
                  >
                    {responding ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {responding ? 'Sending...' : 'Send Response'}
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Info */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Information</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      <span className="ml-1">{ticket.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-600">Priority:</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityBadge(ticket.priority)}`}>
                      {getPriorityIcon(ticket.priority)}
                      <span className="ml-1">{ticket.priority}</span>
                    </span>
                  </div>
                </div>

                {isSupport && (
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <div className="mt-1">
                      <div className="font-medium">{ticket.requester.displayName}</div>
                      <div className="text-gray-500">{ticket.requester.email}</div>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-gray-600">Created:</span>
                  <div className="mt-1 text-gray-900">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </div>
                </div>

                <div>
                  <span className="text-gray-600">Last Updated:</span>
                  <div className="mt-1 text-gray-900">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </div>
                </div>

                <div>
                  <span className="text-gray-600">Responses:</span>
                  <div className="mt-1 text-gray-900">
                    {ticket.responses.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Management */}
            {canUpdateStatus && (
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Manage Status
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Update Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as TicketStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm"
                    >
                      <option value="PENDING_REVIEW">Pending Review</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>

                  <Button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || newStatus === ticket.status || updating}
                    className="w-full flex items-center justify-center"
                    size="sm"
                  >
                    {updating ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Settings className="h-4 w-4 mr-2" />
                    )}
                    {updating ? 'Updating...' : 'Update Status'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}