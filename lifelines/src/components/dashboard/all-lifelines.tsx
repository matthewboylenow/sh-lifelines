'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UserRole } from '@prisma/client'
import { LifeLineWithLeader } from '@/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatDate } from '@/utils/formatters'
import { Search, Eye, Edit, Users, MapPin, Clock, Calendar } from 'lucide-react'

interface AllLifeLinesProps {
  userRole: UserRole
}

export function AllLifeLines({ userRole }: AllLifeLinesProps) {
  const [lifeLines, setLifeLines] = useState<LifeLineWithLeader[]>([])
  const [filteredLifeLines, setFilteredLifeLines] = useState<LifeLineWithLeader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')

  useEffect(() => {
    fetchLifeLines()
  }, [])

  useEffect(() => {
    filterLifeLines()
  }, [lifeLines, searchQuery, statusFilter])

  const fetchLifeLines = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/lifelines?limit=100')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch LifeLines')
      }
      
      setLifeLines(data.data.items || [])
      
    } catch (error) {
      console.error('LifeLines error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load LifeLines')
    } finally {
      setLoading(false)
    }
  }

  const filterLifeLines = () => {
    let filtered = lifeLines

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(lifeLine => 
        lifeLine.title.toLowerCase().includes(query) ||
        lifeLine.description?.toLowerCase().includes(query) ||
        lifeLine.leader?.displayName?.toLowerCase().includes(query) ||
        lifeLine.leader?.email?.toLowerCase().includes(query) ||
        lifeLine.location?.toLowerCase().includes(query)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lifeLine => 
        lifeLine.status.toLowerCase() === statusFilter.toLowerCase()
      )
    }

    setFilteredLifeLines(filtered)
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      PUBLISHED: 'status-badge-published',
      DRAFT: 'status-badge-draft',
      ARCHIVED: 'status-badge-archived',
      FULL: 'status-badge-full'
    }
    
    return (
      <span className={`status-badge ${statusClasses[status as keyof typeof statusClasses] || 'status-badge-draft'}`}>
        {status.toLowerCase()}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2 text-gray-600">Loading LifeLines...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p>Error loading LifeLines: {error}</p>
        </div>
        <Button onClick={fetchLifeLines}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{lifeLines.length}</h3>
              <p className="text-sm text-gray-600">Total LifeLines</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {lifeLines.filter(l => l.status === 'PUBLISHED').length}
              </h3>
              <p className="text-sm text-gray-600">Published</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {lifeLines.filter(l => l.status === 'DRAFT').length}
              </h3>
              <p className="text-sm text-gray-600">Draft</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {lifeLines.filter(l => l.status === 'FULL').length}
              </h3>
              <p className="text-sm text-gray-600">Full</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="dashboard-card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search LifeLines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onChange={(value) => setStatusFilter(value)}>
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="full">Full</option>
              <option value="archived">Archived</option>
            </Select>
            
            <Button
              variant={viewMode === 'table' ? 'primary' : 'outline'}
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {filteredLifeLines.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No LifeLines found</h3>
          <p className="text-gray-600">
            {searchQuery || statusFilter !== 'all'
              ? "Try adjusting your search or filters."
              : "No LifeLines have been created yet."
            }
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="dashboard-card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LifeLine
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leader
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inquiries
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLifeLines.map(lifeLine => (
                <tr key={lifeLine.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{lifeLine.title}</div>
                      {lifeLine.location && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {lifeLine.location}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{lifeLine.leader?.displayName || 'Unassigned'}</div>
                    {lifeLine.leader?.email && (
                      <div className="text-sm text-gray-500">{lifeLine.leader.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(lifeLine.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {lifeLine.meetingFrequency || 'Not specified'}
                    </div>
                    {lifeLine.meetingTime && (
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {lifeLine.meetingTime}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {lifeLine._count?.inquiries || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/lifelines/${lifeLine.id}`}
                        className="text-gray-400 hover:text-gray-600"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {userRole === UserRole.ADMIN && (
                        <Link
                          href={`/lifelines/${lifeLine.id}/edit`}
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLifeLines.map(lifeLine => (
            <div key={lifeLine.id} className="dashboard-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{lifeLine.title}</h3>
                  {getStatusBadge(lifeLine.status)}
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/lifelines/${lifeLine.id}`}
                    className="text-gray-400 hover:text-gray-600"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  {userRole === UserRole.ADMIN && (
                    <Link
                      href={`/lifelines/${lifeLine.id}/edit`}
                      className="text-gray-400 hover:text-gray-600"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{lifeLine.leader?.displayName || 'Unassigned Leader'}</span>
                </div>
                {lifeLine.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{lifeLine.location}</span>
                  </div>
                )}
                {lifeLine.meetingFrequency && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{lifeLine.meetingFrequency}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
                <span>{lifeLine._count?.inquiries || 0} inquiries</span>
                <span>{formatDate(lifeLine.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Summary */}
      <div className="text-center text-sm text-gray-500">
        Showing {filteredLifeLines.length} of {lifeLines.length} LifeLines
      </div>
    </div>
  )
}