'use client'

import { useState, useEffect } from 'react'
import { UserRole } from '@prisma/client'
import { InquiryWithLifeLine } from '@/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/Button'
import { formatDate, formatInquiryStatus } from '@/utils/formatters'
import { Mail, Phone, MessageSquare } from 'lucide-react'

interface LeaderInquiriesProps {
  userId: string
  userRole: UserRole
}

export function LeaderInquiries({ userId, userRole }: LeaderInquiriesProps) {
  const [inquiries, setInquiries] = useState<InquiryWithLifeLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'undecided' | 'joined' | 'not_joined'>('all')

  useEffect(() => {
    fetchInquiries()
  }, [userId, filter])

  const fetchInquiries = async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams({ leaderId: userId })
      if (filter !== 'all') {
        params.append('status', filter.toUpperCase())
      }
      
      const response = await fetch(`/api/inquiries?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch inquiries')
      }
      
      setInquiries(data.data.items || [])
      
    } catch (error) {
      console.error('Inquiries error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load inquiries')
    } finally {
      setLoading(false)
    }
  }

  const updateInquiryStatus = async (inquiryId: string, status: 'JOINED' | 'NOT_JOINED' | 'UNDECIDED') => {
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update inquiry status')
      }

      // Refresh inquiries
      fetchInquiries()
    } catch (error) {
      console.error('Update inquiry error:', error)
      alert('Failed to update inquiry status')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2 text-gray-600">Loading inquiries...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p>Error loading inquiries: {error}</p>
        </div>
        <Button onClick={fetchInquiries}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Inquiries
        </Button>
        <Button
          variant={filter === 'undecided' ? 'primary' : 'outline'}
          onClick={() => setFilter('undecided')}
        >
          Pending
        </Button>
        <Button
          variant={filter === 'joined' ? 'primary' : 'outline'}
          onClick={() => setFilter('joined')}
        >
          Joined
        </Button>
        <Button
          variant={filter === 'not_joined' ? 'primary' : 'outline'}
          onClick={() => setFilter('not_joined')}
        >
          Not Joined
        </Button>
      </div>

      {/* Inquiries List */}
      {inquiries.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No inquiries found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? "You haven't received any member inquiries yet."
              : `No ${filter === 'undecided' ? 'pending' : filter.replace('_', ' ')} inquiries found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <div key={inquiry.id} className="dashboard-card">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {inquiry.personName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Interested in: <span className="font-medium">{inquiry.lifeLine.title}</span>
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {inquiry.personEmail && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${inquiry.personEmail}`} className="hover:text-primary-600">
                          {inquiry.personEmail}
                        </a>
                      </div>
                    )}
                    {inquiry.personPhone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${inquiry.personPhone}`} className="hover:text-primary-600">
                          {inquiry.personPhone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                  <span className={`status-badge ${
                    inquiry.status === 'JOINED' 
                      ? 'status-badge-joined'
                      : inquiry.status === 'NOT_JOINED'
                      ? 'status-badge-not-joined'
                      : 'status-badge-undecided'
                  }`}>
                    {formatInquiryStatus(inquiry.status)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(inquiry.createdAt)}
                  </span>
                </div>
              </div>

              {inquiry.message && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{inquiry.message}</p>
                </div>
              )}

              {inquiry.status === 'UNDECIDED' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateInquiryStatus(inquiry.id, 'JOINED')}
                  >
                    Mark as Joined
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateInquiryStatus(inquiry.id, 'NOT_JOINED')}
                  >
                    Mark as Not Joined
                  </Button>
                </div>
              )}

              {inquiry.status !== 'UNDECIDED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateInquiryStatus(inquiry.id, 'UNDECIDED')}
                >
                  Reset to Pending
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}