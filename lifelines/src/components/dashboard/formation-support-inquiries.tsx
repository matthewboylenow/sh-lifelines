'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { InquiryWithLifeLine } from '@/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/Button'
import { formatDate, formatInquiryStatus } from '@/utils/formatters'
import { Mail, Phone, MessageSquare, Users, ArrowLeft } from 'lucide-react'

export function FormationSupportInquiries() {
  const [inquiries, setInquiries] = useState<InquiryWithLifeLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'undecided' | 'joined' | 'not_joined'>('all')

  useEffect(() => {
    fetchInquiries()
  }, [filter])

  const fetchInquiries = async () => {
    try {
      setLoading(true)

      // Build query parameters - no leaderId to get ALL inquiries
      const params = new URLSearchParams()
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

  // Group inquiries by LifeLine for better organization
  const groupedInquiries = inquiries.reduce((acc, inquiry) => {
    const lifeLineId = inquiry.lifeLine.id
    if (!acc[lifeLineId]) {
      acc[lifeLineId] = {
        lifeLine: inquiry.lifeLine,
        inquiries: []
      }
    }
    acc[lifeLineId].inquiries.push(inquiry)
    return acc
  }, {} as Record<string, { lifeLine: { id: string; title: string }; inquiries: InquiryWithLifeLine[] }>)

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/formation-support"
        className="inline-flex items-center text-primary-600 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Link>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{inquiries.length}</div>
          <div className="text-sm text-gray-600">Total Inquiries</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">
            {inquiries.filter(i => i.status === 'UNDECIDED').length}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {inquiries.filter(i => i.status === 'JOINED').length}
          </div>
          <div className="text-sm text-gray-600">Joined</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-red-600">
            {inquiries.filter(i => i.status === 'NOT_JOINED').length}
          </div>
          <div className="text-sm text-gray-600">Not Joined</div>
        </div>
      </div>

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

      {/* Inquiries List - Grouped by LifeLine */}
      {inquiries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No inquiries found</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? "There are no member inquiries yet."
              : `No ${filter === 'undecided' ? 'pending' : filter.replace('_', ' ')} inquiries found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedInquiries).map(({ lifeLine, inquiries: lifeLineInquiries }) => (
            <div key={lifeLine.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {/* LifeLine Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary-600" />
                    <Link
                      href={`/lifelines/${lifeLine.id}`}
                      className="font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {lifeLine.title}
                    </Link>
                  </div>
                  <span className="text-sm text-gray-500">
                    {lifeLineInquiries.length} {lifeLineInquiries.length === 1 ? 'inquiry' : 'inquiries'}
                  </span>
                </div>
              </div>

              {/* Inquiries for this LifeLine */}
              <div className="divide-y divide-gray-100">
                {lifeLineInquiries.map((inquiry) => (
                  <div key={inquiry.id} className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {inquiry.personName}
                        </h3>
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

                      <div className="flex items-center gap-2 mt-3 md:mt-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          inquiry.status === 'JOINED'
                            ? 'bg-green-100 text-green-800'
                            : inquiry.status === 'NOT_JOINED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {formatInquiryStatus(inquiry.status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(inquiry.createdAt)}
                        </span>
                      </div>
                    </div>

                    {inquiry.message && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
