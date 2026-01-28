'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  MessageSquare
} from 'lucide-react'
import { InquiryStatus } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDate, formatRelativeTime } from '@/utils/formatters'

interface InquiryWithDetails {
  id: string
  personName: string
  personEmail: string | null
  personPhone: string | null
  message: string | null
  status: InquiryStatus
  source: string
  notJoinedReason: string | null
  leaderNotes: string | null
  createdAt: string
  updatedAt: string
  joinedAt: string | null
  lastContactedAt: string | null
  daysSinceRequest: number
  needsFollowUp: boolean
  lifeLine: {
    id: string
    title: string
    groupLeader: string
    leaderId: string
    leader: {
      id: string
      displayName: string | null
      email: string
    }
  }
}

interface Stats {
  total: number
  undecided: number
  joined: number
  notJoined: number
  needsAttention: number
  recentWeek: number
  joinRate: number
}

interface FilterOption {
  id: string
  title?: string
  displayName?: string | null
  email?: string
}

export function InquiryTrackingDashboard() {
  const [inquiries, setInquiries] = useState<InquiryWithDetails[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [lifeLineOptions, setLifeLineOptions] = useState<FilterOption[]>([])
  const [leaderOptions, setLeaderOptions] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [lifeLineFilter, setLifeLineFilter] = useState<string>('all')
  const [leaderFilter, setLeaderFilter] = useState<string>('all')
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Expanded rows for details
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Status update modal
  const [updatingInquiry, setUpdatingInquiry] = useState<InquiryWithDetails | null>(null)
  const [newStatus, setNewStatus] = useState<InquiryStatus>('UNDECIDED')
  const [notJoinedReason, setNotJoinedReason] = useState('')
  const [leaderNotes, setLeaderNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')

      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (lifeLineFilter !== 'all') {
        params.set('lifeLineId', lifeLineFilter)
      }
      if (leaderFilter !== 'all') {
        params.set('leaderId', leaderFilter)
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }
      if (needsAttentionOnly) {
        params.set('needsAttention', 'true')
      }

      const response = await fetch(`/api/admin/inquiry-tracking?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data')
      }

      setStats(data.data.stats)
      setInquiries(data.data.items || [])
      setTotalPages(data.data.totalPages || 1)
      setTotalItems(data.data.total || 0)
      setLifeLineOptions(data.data.filters?.lifeLines || [])
      setLeaderOptions(data.data.filters?.leaders || [])
    } catch (err) {
      console.error('Error fetching inquiry tracking data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, lifeLineFilter, leaderFilter, searchQuery, needsAttentionOnly])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const openStatusModal = (inquiry: InquiryWithDetails) => {
    setUpdatingInquiry(inquiry)
    setNewStatus(inquiry.status)
    setNotJoinedReason(inquiry.notJoinedReason || '')
    setLeaderNotes(inquiry.leaderNotes || '')
  }

  const closeStatusModal = () => {
    setUpdatingInquiry(null)
    setNewStatus('UNDECIDED')
    setNotJoinedReason('')
    setLeaderNotes('')
  }

  const handleStatusUpdate = async () => {
    if (!updatingInquiry) return

    if (newStatus === 'NOT_JOINED' && !notJoinedReason.trim()) {
      alert('Please provide a reason for why this person did not join.')
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/inquiries/${updatingInquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notJoinedReason: newStatus === 'NOT_JOINED' ? notJoinedReason : null,
          leaderNotes: leaderNotes || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update inquiry')
      }

      closeStatusModal()
      fetchData() // Refresh data
    } catch (err) {
      console.error('Error updating inquiry:', err)
      alert('Failed to update inquiry status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleExport = async () => {
    window.open('/api/export/inquiries', '_blank')
  }

  const getStatusBadge = (status: InquiryStatus, needsFollowUp: boolean) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold'

    if (status === 'UNDECIDED') {
      return (
        <span className={`${baseClasses} ${needsFollowUp ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {needsFollowUp && <AlertTriangle className="w-3 h-3 mr-1" />}
          Pending
        </span>
      )
    }
    if (status === 'JOINED') {
      return <span className={`${baseClasses} bg-green-100 text-green-800`}>Joined</span>
    }
    if (status === 'NOT_JOINED') {
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Not Joined</span>
    }
    return <span className={`${baseClasses} bg-gray-100 text-gray-600`}>{status}</span>
  }

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2 text-gray-600">Loading inquiry data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p>Error: {error}</p>
        </div>
        <Button onClick={fetchData}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="stat-card">
            <div className="stat-card-icon bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="stat-card-value">{stats.total}</div>
              <div className="stat-card-label">Total Inquiries</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <div className="stat-card-value">{stats.undecided}</div>
              <div className="stat-card-label">Pending Review</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon bg-green-100">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="stat-card-value">{stats.joined}</div>
              <div className="stat-card-label">Joined</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon bg-gray-100">
              <UserX className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <div className="stat-card-value">{stats.notJoined}</div>
              <div className="stat-card-label">Not Joined</div>
            </div>
          </div>

          <div className="stat-card glow-hover cursor-pointer" onClick={() => setNeedsAttentionOnly(!needsAttentionOnly)}>
            <div className={`stat-card-icon ${stats.needsAttention > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertTriangle className={`h-6 w-6 ${stats.needsAttention > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <div className={`stat-card-value ${stats.needsAttention > 0 ? 'text-red-600' : ''}`}>
                {stats.needsAttention}
              </div>
              <div className="stat-card-label">Needs Attention</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon bg-secondary-100">
              <TrendingUp className="h-6 w-6 text-secondary-600" />
            </div>
            <div>
              <div className="stat-card-value text-secondary-600">{stats.joinRate}%</div>
              <div className="stat-card-label">Join Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="dashboard-card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by name, email, or LifeLine..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="form-input form-select text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="UNDECIDED">Pending</option>
              <option value="JOINED">Joined</option>
              <option value="NOT_JOINED">Not Joined</option>
            </select>

            <select
              value={lifeLineFilter}
              onChange={(e) => {
                setLifeLineFilter(e.target.value)
                setPage(1)
              }}
              className="form-input form-select text-sm"
            >
              <option value="all">All LifeLines</option>
              {lifeLineOptions.map(ll => (
                <option key={ll.id} value={ll.id}>{ll.title}</option>
              ))}
            </select>

            <select
              value={leaderFilter}
              onChange={(e) => {
                setLeaderFilter(e.target.value)
                setPage(1)
              }}
              className="form-input form-select text-sm"
            >
              <option value="all">All Leaders</option>
              {leaderOptions.map(leader => (
                <option key={leader.id} value={leader.id}>
                  {leader.displayName || leader.email}
                </option>
              ))}
            </select>

            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Active filters indicator */}
        {(statusFilter !== 'all' || lifeLineFilter !== 'all' || leaderFilter !== 'all' || searchQuery || needsAttentionOnly) && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Filters active:</span>
            <button
              onClick={() => {
                setStatusFilter('all')
                setLifeLineFilter('all')
                setLeaderFilter('all')
                setSearchQuery('')
                setNeedsAttentionOnly(false)
                setPage(1)
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {inquiries.length} of {totalItems} inquiries
      </div>

      {/* Inquiries Table */}
      <div className="dashboard-card overflow-hidden p-0">
        {inquiries.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inquiries found</h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== 'all' || lifeLineFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'No one has requested to join a LifeLine yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Person
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    LifeLine
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Days Waiting
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inquiries.map((inquiry) => (
                  <>
                    <tr
                      key={inquiry.id}
                      className={`hover:bg-gray-50 transition-colors ${inquiry.needsFollowUp ? 'bg-red-50/50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{inquiry.personName}</div>
                          {inquiry.personEmail && (
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <Mail className="h-3 w-3 mr-1" />
                              <a href={`mailto:${inquiry.personEmail}`} className="hover:text-primary-600">
                                {inquiry.personEmail}
                              </a>
                            </div>
                          )}
                          {inquiry.personPhone && (
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <Phone className="h-3 w-3 mr-1" />
                              {inquiry.personPhone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            href={`/lifelines/${inquiry.lifeLine.id}`}
                            className="font-medium text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            {inquiry.lifeLine.title}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Link>
                          <div className="text-sm text-gray-500 mt-1">
                            Leader: {inquiry.lifeLine.leader?.displayName || inquiry.lifeLine.groupLeader}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {formatDate(inquiry.createdAt)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatRelativeTime(inquiry.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-lg font-semibold ${
                          inquiry.status === 'UNDECIDED'
                            ? inquiry.daysSinceRequest > 7
                              ? 'text-red-600'
                              : inquiry.daysSinceRequest > 3
                                ? 'text-yellow-600'
                                : 'text-gray-600'
                            : 'text-gray-400'
                        }`}>
                          {inquiry.status === 'UNDECIDED' ? inquiry.daysSinceRequest : '—'}
                        </span>
                        {inquiry.status === 'UNDECIDED' && inquiry.daysSinceRequest > 0 && (
                          <span className="text-xs text-gray-500 ml-1">days</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(inquiry.status, inquiry.needsFollowUp)}
                        {inquiry.status === 'JOINED' && inquiry.joinedAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(inquiry.joinedAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStatusModal(inquiry)}
                          >
                            Update
                          </Button>
                          <button
                            onClick={() => toggleRow(inquiry.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {expandedRows.has(inquiry.id) ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded details row */}
                    {expandedRows.has(inquiry.id) && (
                      <tr key={`${inquiry.id}-details`} className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {inquiry.message && (
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                  Message from Inquirer
                                </div>
                                <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border">
                                  <MessageSquare className="h-4 w-4 text-gray-400 inline mr-1" />
                                  {inquiry.message}
                                </div>
                              </div>
                            )}
                            {inquiry.notJoinedReason && (
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                  Reason Not Joined
                                </div>
                                <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-red-200">
                                  {inquiry.notJoinedReason}
                                </div>
                              </div>
                            )}
                            {inquiry.leaderNotes && (
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                  Leader Notes
                                </div>
                                <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border">
                                  {inquiry.leaderNotes}
                                </div>
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                Source
                              </div>
                              <div className="text-sm text-gray-700">
                                {inquiry.source?.replace(/_/g, ' ') || 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
      )}

      {/* Status Update Modal */}
      {updatingInquiry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Update Inquiry Status
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {updatingInquiry.personName} - {updatingInquiry.lifeLine.title}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as InquiryStatus)}
                  className="form-input form-select w-full"
                >
                  <option value="UNDECIDED">Pending Review</option>
                  <option value="JOINED">Joined</option>
                  <option value="NOT_JOINED">Not Joined</option>
                </select>
              </div>

              {newStatus === 'NOT_JOINED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Not Joining <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={notJoinedReason}
                    onChange={(e) => setNotJoinedReason(e.target.value)}
                    rows={3}
                    className="form-input w-full"
                    placeholder="e.g., Schedule conflict, found another group, not interested at this time..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This helps us understand why people don&apos;t join and improve our outreach.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={leaderNotes}
                  onChange={(e) => setLeaderNotes(e.target.value)}
                  rows={2}
                  className="form-input w-full"
                  placeholder="Any additional notes about this inquiry..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={closeStatusModal}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={isUpdating || (newStatus === 'NOT_JOINED' && !notJoinedReason.trim())}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
