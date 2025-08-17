'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Users, 
  Settings, 
  LifeBuoy, 
  BookOpen, 
  Shield, 
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Crown,
  UserCheck,
  FileText,
  Download,
  Upload
} from 'lucide-react'
import { UserRole, LifeLineStatus } from '@prisma/client'
import { LifeLineWithLeader } from '@/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserManagement } from './user-management'

interface AdminDashboardProps {
  userId: string
  userRole: UserRole
}

interface AdminStats {
  totalLifeLines: number
  totalUsers: number
  pendingFormationRequests: number
  totalInquiries: number
  activeLeaders: number
  hiddenLifeLines: number
}

export function AdminDashboard({ userId, userRole }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'lifelines' | 'users' | 'settings'>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [lifeLines, setLifeLines] = useState<LifeLineWithLeader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<LifeLineStatus | 'ALL'>('ALL')

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      
      // Fetch admin stats from API
      const statsResponse = await fetch('/api/admin/stats')
      const statsData = await statsResponse.json()
      
      if (statsResponse.ok) {
        setStats(statsData.data)
      } else {
        // Fallback to defaults if stats API doesn't exist yet
        setStats({
          totalLifeLines: 0,
          totalUsers: 0,
          pendingFormationRequests: 0,
          totalInquiries: 0,
          activeLeaders: 0,
          hiddenLifeLines: 0
        })
      }

      // Fetch all LifeLines for admin management
      const response = await fetch('/api/lifelines?includeAll=true')
      const data = await response.json()
      
      if (response.ok) {
        setLifeLines(data.data.items || [])
        
        // Calculate stats from the actual data if API doesn't exist
        if (!statsResponse.ok) {
          const lifeLines = data.data.items || []
          setStats({
            totalLifeLines: lifeLines.length,
            totalUsers: 0, // This would need a separate API call
            pendingFormationRequests: 0, // This would need a separate API call
            totalInquiries: lifeLines.reduce((sum: number, ll: any) => sum + (ll._count?.inquiries || 0), 0),
            activeLeaders: new Set(lifeLines.map((ll: any) => ll.leaderId).filter(Boolean)).size,
            hiddenLifeLines: lifeLines.filter((ll: any) => ll.status === 'ARCHIVED' || !ll.isVisible).length
          })
        }
      }
      
    } catch (error) {
      console.error('Admin data error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const toggleLifeLineVisibility = async (lifeLineId: string, currentStatus: LifeLineStatus) => {
    try {
      const newStatus = currentStatus === 'ARCHIVED' ? 'PUBLISHED' : 'ARCHIVED'
      
      const response = await fetch(`/api/lifelines/${lifeLineId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setLifeLines(prev => 
          prev.map(lifeline => 
            lifeline.id === lifeLineId 
              ? { ...lifeline, status: newStatus }
              : lifeline
          )
        )
      }
    } catch (error) {
      console.error('Error updating LifeLine visibility:', error)
    }
  }

  const filteredLifeLines = lifeLines.filter(lifeline => {
    const matchesSearch = lifeline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lifeline.groupLeader.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || lifeline.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2 text-gray-600">Loading admin dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p>Error loading admin dashboard: {error}</p>
        </div>
        <Button onClick={fetchAdminData}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Admin Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: Shield },
            { id: 'lifelines', name: 'LifeLines Management', icon: BookOpen },
            { id: 'users', name: 'User Management', icon: Users },
            { id: 'settings', name: 'System Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="dashboard-card">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {stats?.totalLifeLines || 0}
                  </h3>
                  <p className="text-sm text-gray-600">Total LifeLines</p>
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
                    {stats?.totalUsers || 0}
                  </h3>
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Crown className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {stats?.activeLeaders || 0}
                  </h3>
                  <p className="text-sm text-gray-600">Active Leaders</p>
                </div>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="flex items-center">
                <div className="bg-red-100 p-3 rounded-lg">
                  <FileText className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {stats?.pendingFormationRequests || 0}
                  </h3>
                  <p className="text-sm text-gray-600">Pending Requests</p>
                </div>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <LifeBuoy className="h-8 w-8 text-purple-600" />
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
                <div className="bg-gray-100 p-3 rounded-lg">
                  <EyeOff className="h-8 w-8 text-gray-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {stats?.hiddenLifeLines || 0}
                  </h3>
                  <p className="text-sm text-gray-600">Hidden LifeLines</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => setActiveTab('lifelines')}
                  className="flex items-center justify-center"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Manage LifeLines
                </Button>
                <Link href="/lifelines/create">
                  <Button 
                    variant="secondary"
                    size="sm"
                    className="w-full flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New LifeLine
                  </Button>
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  variant="secondary"
                  onClick={() => setActiveTab('users')}
                  className="flex items-center justify-center"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Link href="/register">
                  <Button 
                    variant="secondary"
                    size="sm"
                    className="w-full flex items-center justify-center"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Register New User
                  </Button>
                </Link>
              </div>
              <Button 
                variant="outline"
                className="flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Link href="/admin/import">
                <Button 
                  variant="outline"
                  className="w-full flex items-center justify-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import WordPress Data
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* LifeLines Management Tab */}
      {activeTab === 'lifelines' && (
        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="dashboard-card">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search LifeLines by title or leader..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as LifeLineStatus | 'ALL')}
                  className="form-input"
                >
                  <option value="ALL">All Status</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Hidden/Archived</option>
                  <option value="FULL">Full</option>
                </select>
              </div>
              <Link href="/lifelines/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add LifeLine
                </Button>
              </Link>
            </div>
          </div>

          {/* LifeLines Table */}
          <div className="dashboard-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
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
                      Inquiries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLifeLines.map((lifeline) => (
                    <tr key={lifeline.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {lifeline.title}
                            </div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {lifeline.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{lifeline.groupLeader}</div>
                        <div className="text-sm text-gray-500">{lifeline.leaderEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`status-badge ${
                          lifeline.status === 'PUBLISHED' 
                            ? 'status-badge-published' 
                            : lifeline.status === 'FULL'
                            ? 'status-badge-full'
                            : lifeline.status === 'DRAFT'
                            ? 'status-badge-draft'
                            : 'status-badge-archived'
                        }`}>
                          {lifeline.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lifeline._count?.inquiries || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/lifelines/${lifeline.id}`}
                            className="text-gray-400 hover:text-gray-600"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/lifelines/${lifeline.id}/edit`}
                            className="text-gray-400 hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => toggleLifeLineVisibility(lifeline.id, lifeline.status)}
                            className="text-gray-400 hover:text-yellow-600"
                            title={lifeline.status === 'ARCHIVED' ? 'Show LifeLine' : 'Hide LifeLine'}
                          >
                            {lifeline.status === 'ARCHIVED' ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            className="text-gray-400 hover:text-red-600"
                            title="Delete"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this LifeLine?')) {
                                // Handle delete
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Management Tab */}
      {activeTab === 'users' && (
        <UserManagement currentUserRole={userRole} />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="dashboard-card">
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">System Settings</h3>
            <p className="text-gray-600 mb-6">
              Configure system settings, email templates, and integrations.
            </p>
            <Link href="/dashboard/admin/settings">
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Configure Settings
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}