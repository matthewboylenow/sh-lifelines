'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Download,
  Search,
  Mail,
  Phone,
  Calendar,
  Filter,
  RefreshCw,
  UserCheck,
  FileSpreadsheet,
  UserX,
  AlertTriangle,
  X
} from 'lucide-react'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDate } from '@/utils/formatters'

interface Member {
  id: string
  personName: string
  personEmail: string | null
  personPhone: string | null
  status: string
  joinedAt: string | null
  createdAt: string
  removedReason: string | null
  removedAt: string | null
  lifeLine: {
    id: string
    title: string
  }
}

interface LifeLineOption {
  id: string
  title: string
  memberCount: number
}

interface LeaderMembersViewProps {
  userId: string
  userRole: UserRole
}

export function LeaderMembersView({ userId, userRole }: LeaderMembersViewProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [removedMembers, setRemovedMembers] = useState<Member[]>([])
  const [lifeLines, setLifeLines] = useState<LifeLineOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLifeLine, setSelectedLifeLine] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'active' | 'removed'>('active')

  // Stats
  const [totalMembers, setTotalMembers] = useState(0)

  // Removal dialog
  const [removingMember, setRemovingMember] = useState<Member | null>(null)
  const [removalReason, setRemovalReason] = useState('')
  const [isRemoving, setIsRemoving] = useState(false)
  const [removalError, setRemovalError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch leader's LifeLines first
      const lifelinesRes = await fetch(`/api/lifelines?leaderId=${userId}`)
      const lifelinesData = await lifelinesRes.json()

      if (!lifelinesRes.ok) {
        throw new Error(lifelinesData.error || 'Failed to fetch LifeLines')
      }

      const userLifeLines = lifelinesData.data.items || []

      if (userLifeLines.length === 0) {
        setLifeLines([])
        setMembers([])
        setRemovedMembers([])
        setTotalMembers(0)
        return
      }

      // Fetch all joined inquiries for these LifeLines
      const lifeLineIds = userLifeLines.map((ll: any) => ll.id)

      // Fetch joined members
      const membersPromises = lifeLineIds.map((id: string) =>
        fetch(`/api/inquiries?lifeLineId=${id}&status=JOINED&limit=1000`)
          .then(res => res.json())
          .then(data => data.data?.items || [])
      )

      // Fetch removed members
      const removedPromises = lifeLineIds.map((id: string) =>
        fetch(`/api/inquiries?lifeLineId=${id}&status=REMOVED&limit=1000`)
          .then(res => res.json())
          .then(data => data.data?.items || [])
      )

      const [membersResults, removedResults] = await Promise.all([
        Promise.all(membersPromises),
        Promise.all(removedPromises)
      ])

      const allMembers = membersResults.flat()
      const allRemoved = removedResults.flat()

      // Build LifeLine options with member counts
      const lifeLineOptions: LifeLineOption[] = userLifeLines.map((ll: any) => ({
        id: ll.id,
        title: ll.title,
        memberCount: allMembers.filter((m: Member) => m.lifeLine.id === ll.id).length
      }))

      setLifeLines(lifeLineOptions)
      setMembers(allMembers)
      setRemovedMembers(allRemoved)
      setTotalMembers(allMembers.length)

    } catch (err) {
      console.error('Error fetching members:', err)
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter members based on search and selected LifeLine
  const filterMembers = (list: Member[]) =>
    list.filter(member => {
      const matchesSearch = !searchQuery.trim() ||
        member.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.personEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.personPhone?.includes(searchQuery)

      const matchesLifeLine = selectedLifeLine === 'all' ||
        member.lifeLine.id === selectedLifeLine

      return matchesSearch && matchesLifeLine
    })

  const filteredMembers = filterMembers(members)
  const filteredRemoved = filterMembers(removedMembers)

  // Handle member removal
  const handleRemoveMember = async () => {
    if (!removingMember || !removalReason.trim()) return

    setIsRemoving(true)
    setRemovalError(null)

    try {
      const res = await fetch(`/api/inquiries/${removingMember.id}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removedReason: removalReason.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove member')
      }

      // Close dialog and refresh data
      setRemovingMember(null)
      setRemovalReason('')
      await fetchData()
    } catch (err) {
      setRemovalError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setIsRemoving(false)
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    const dataToExport = activeTab === 'active' ? filteredMembers : filteredRemoved

    if (dataToExport.length === 0) {
      alert('No members to export')
      return
    }

    const headers = activeTab === 'active'
      ? ['Name', 'Email', 'Phone', 'LifeLine', 'Joined Date', 'Request Date']
      : ['Name', 'Email', 'Phone', 'LifeLine', 'Removed Date', 'Removal Reason']

    const rows = dataToExport.map(member =>
      activeTab === 'active'
        ? [
            member.personName,
            member.personEmail || '',
            member.personPhone || '',
            member.lifeLine.title,
            member.joinedAt ? formatDate(member.joinedAt) : '',
            formatDate(member.createdAt)
          ]
        : [
            member.personName,
            member.personEmail || '',
            member.personPhone || '',
            member.lifeLine.title,
            member.removedAt ? formatDate(member.removedAt) : '',
            member.removedReason || ''
          ]
    )

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `lifeline-${activeTab}-members-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export to Excel-compatible format (CSV with BOM for Excel)
  const handleExportExcel = () => {
    const dataToExport = activeTab === 'active' ? filteredMembers : filteredRemoved

    if (dataToExport.length === 0) {
      alert('No members to export')
      return
    }

    const headers = activeTab === 'active'
      ? ['Name', 'Email', 'Phone', 'LifeLine', 'Joined Date', 'Request Date']
      : ['Name', 'Email', 'Phone', 'LifeLine', 'Removed Date', 'Removal Reason']

    const rows = dataToExport.map(member =>
      activeTab === 'active'
        ? [
            member.personName,
            member.personEmail || '',
            member.personPhone || '',
            member.lifeLine.title,
            member.joinedAt ? formatDate(member.joinedAt) : '',
            formatDate(member.createdAt)
          ]
        : [
            member.personName,
            member.personEmail || '',
            member.personPhone || '',
            member.lifeLine.title,
            member.removedAt ? formatDate(member.removedAt) : '',
            member.removedReason || ''
          ]
    )

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `lifeline-${activeTab}-members-${new Date().toISOString().split('T')[0]}.xls`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2 text-gray-600">Loading members...</span>
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
      {/* Removal Confirmation Dialog */}
      {removingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-red-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <h3 className="text-lg font-semibold">Remove Member</h3>
              </div>
              <button
                onClick={() => {
                  setRemovingMember(null)
                  setRemovalReason('')
                  setRemovalError(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to remove <strong>{removingMember.personName}</strong> from{' '}
              <strong>{removingMember.lifeLine.title}</strong>?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for removal <span className="text-red-500">*</span>
              </label>
              <textarea
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder="Please provide a reason for removing this member..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {removalError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {removalError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setRemovingMember(null)
                  setRemovalReason('')
                  setRemovalError(null)
                }}
                variant="outline"
                disabled={isRemoving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRemoveMember}
                disabled={!removalReason.trim() || isRemoving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isRemoving ? 'Removing...' : 'Remove Member'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card-icon bg-green-100">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <div className="stat-card-value">{totalMembers}</div>
            <div className="stat-card-label">Active Members</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon bg-blue-100">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <div className="stat-card-value">{lifeLines.length}</div>
            <div className="stat-card-label">Your LifeLines</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon bg-red-100">
            <UserX className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <div className="stat-card-value">{removedMembers.length}</div>
            <div className="stat-card-label">Removed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon bg-secondary-100">
            <Filter className="h-6 w-6 text-secondary-600" />
          </div>
          <div>
            <div className="stat-card-value">
              {activeTab === 'active' ? filteredMembers.length : filteredRemoved.length}
            </div>
            <div className="stat-card-label">Showing</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Active Members ({totalMembers})
        </button>
        <button
          onClick={() => setActiveTab('removed')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'removed'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Removed ({removedMembers.length})
        </button>
      </div>

      {/* Filters and Export */}
      <div className="dashboard-card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedLifeLine}
              onChange={(e) => setSelectedLifeLine(e.target.value)}
              className="form-input form-select text-sm"
            >
              <option value="all">All LifeLines ({totalMembers})</option>
              {lifeLines.map(ll => (
                <option key={ll.id} value={ll.id}>
                  {ll.title} ({ll.memberCount})
                </option>
              ))}
            </select>

            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>

            <Button onClick={handleExportExcel} variant="secondary" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="dashboard-card overflow-hidden p-0">
        {lifeLines.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No LifeLines Found</h3>
            <p className="text-gray-600">
              You don&apos;t have any LifeLines assigned to you yet.
            </p>
          </div>
        ) : activeTab === 'active' ? (
          /* Active Members Tab */
          filteredMembers.length === 0 ? (
            <div className="text-center py-12 px-6">
              <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Members Found</h3>
              <p className="text-gray-600">
                {searchQuery || selectedLifeLine !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'No one has joined your LifeLines yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      LifeLine
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{member.personName}</div>
                      </td>
                      <td className="px-6 py-4">
                        {member.personEmail ? (
                          <a
                            href={`mailto:${member.personEmail}`}
                            className="text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <Mail className="h-4 w-4 mr-1 text-gray-400" />
                            {member.personEmail}
                          </a>
                        ) : (
                          <span className="text-gray-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {member.personPhone ? (
                          <a
                            href={`tel:${member.personPhone}`}
                            className="text-gray-700 hover:text-primary-600 flex items-center"
                          >
                            <Phone className="h-4 w-4 mr-1 text-gray-400" />
                            {member.personPhone}
                          </a>
                        ) : (
                          <span className="text-gray-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{member.lifeLine.title}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {member.joinedAt ? formatDate(member.joinedAt) : formatDate(member.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setRemovingMember(member)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                          title="Remove member from LifeLine"
                        >
                          <UserX className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Removed Members Tab */
          filteredRemoved.length === 0 ? (
            <div className="text-center py-12 px-6">
              <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Removed Members</h3>
              <p className="text-gray-600">
                {searchQuery || selectedLifeLine !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'No members have been removed from your LifeLines.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      LifeLine
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Removed
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRemoved.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{member.personName}</div>
                      </td>
                      <td className="px-6 py-4">
                        {member.personEmail ? (
                          <span className="text-gray-600">{member.personEmail}</span>
                        ) : (
                          <span className="text-gray-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{member.lifeLine.title}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {member.removedAt ? formatDate(member.removedAt) : '\u2014'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 max-w-xs truncate block" title={member.removedReason || ''}>
                          {member.removedReason || '\u2014'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Results count */}
      {(activeTab === 'active' ? filteredMembers.length : filteredRemoved.length) > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {activeTab === 'active' ? filteredMembers.length : filteredRemoved.length} of{' '}
          {activeTab === 'active' ? totalMembers : removedMembers.length}{' '}
          {activeTab === 'active' ? 'active' : 'removed'} members
        </div>
      )}
    </div>
  )
}
