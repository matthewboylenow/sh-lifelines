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
  FileSpreadsheet
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
  joinedAt: string | null
  createdAt: string
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
  const [lifeLines, setLifeLines] = useState<LifeLineOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLifeLine, setSelectedLifeLine] = useState<string>('all')

  // Stats
  const [totalMembers, setTotalMembers] = useState(0)

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
        setTotalMembers(0)
        return
      }

      // Fetch all joined inquiries for these LifeLines
      const lifeLineIds = userLifeLines.map((ll: any) => ll.id)
      const membersPromises = lifeLineIds.map((id: string) =>
        fetch(`/api/inquiries?lifeLineId=${id}&status=JOINED&limit=1000`)
          .then(res => res.json())
          .then(data => data.data?.items || [])
      )

      const membersResults = await Promise.all(membersPromises)
      const allMembers = membersResults.flat()

      // Build LifeLine options with member counts
      const lifeLineOptions: LifeLineOption[] = userLifeLines.map((ll: any) => ({
        id: ll.id,
        title: ll.title,
        memberCount: allMembers.filter((m: Member) => m.lifeLine.id === ll.id).length
      }))

      setLifeLines(lifeLineOptions)
      setMembers(allMembers)
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
  const filteredMembers = members.filter(member => {
    const matchesSearch = !searchQuery.trim() ||
      member.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.personEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.personPhone?.includes(searchQuery)

    const matchesLifeLine = selectedLifeLine === 'all' ||
      member.lifeLine.id === selectedLifeLine

    return matchesSearch && matchesLifeLine
  })

  // Export to CSV
  const handleExportCSV = () => {
    const dataToExport = filteredMembers

    if (dataToExport.length === 0) {
      alert('No members to export')
      return
    }

    // Build CSV content
    const headers = ['Name', 'Email', 'Phone', 'LifeLine', 'Joined Date', 'Request Date']
    const rows = dataToExport.map(member => [
      member.personName,
      member.personEmail || '',
      member.personPhone || '',
      member.lifeLine.title,
      member.joinedAt ? formatDate(member.joinedAt) : '',
      formatDate(member.createdAt)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `lifeline-members-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export to Excel-compatible format (CSV with BOM for Excel)
  const handleExportExcel = () => {
    const dataToExport = filteredMembers

    if (dataToExport.length === 0) {
      alert('No members to export')
      return
    }

    // Build CSV content with BOM for Excel compatibility
    const headers = ['Name', 'Email', 'Phone', 'LifeLine', 'Joined Date', 'Request Date']
    const rows = dataToExport.map(member => [
      member.personName,
      member.personEmail || '',
      member.personPhone || '',
      member.lifeLine.title,
      member.joinedAt ? formatDate(member.joinedAt) : '',
      formatDate(member.createdAt)
    ])

    const csvContent = '\uFEFF' + [ // BOM for Excel
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Download file
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `lifeline-members-${new Date().toISOString().split('T')[0]}.xls`)
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-card-icon bg-green-100">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <div className="stat-card-value">{totalMembers}</div>
            <div className="stat-card-label">Total Members</div>
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
          <div className="stat-card-icon bg-secondary-100">
            <Filter className="h-6 w-6 text-secondary-600" />
          </div>
          <div>
            <div className="stat-card-value">{filteredMembers.length}</div>
            <div className="stat-card-label">Showing</div>
          </div>
        </div>
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
        ) : filteredMembers.length === 0 ? (
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
                        <span className="text-gray-400">—</span>
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
                        <span className="text-gray-400">—</span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results count */}
      {filteredMembers.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredMembers.length} of {totalMembers} members
        </div>
      )}
    </div>
  )
}
