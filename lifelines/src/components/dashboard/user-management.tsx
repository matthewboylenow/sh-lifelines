'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Shield,
  Crown,
  UserCheck,
  Mail,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react'
import { UserRole } from '@prisma/client'
import { hasRole } from '@/lib/auth-utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDate } from '@/utils/formatters'

interface User {
  id: string
  email: string
  displayName?: string | null
  roles: UserRole[]
  isActive: boolean
  lastLoginAt?: Date | null
  createdAt: Date
  updatedAt: Date
  _count: {
    ledLifeLines: number
    formationRequests: number
    supportTickets: number
  }
}

interface UserManagementProps {
  currentUserRole: UserRole
}

const getRoleColor = (role: UserRole) => {
  switch (role) {
    case UserRole.ADMIN: return 'bg-yellow-100 text-yellow-800'
    case UserRole.FORMATION_SUPPORT_TEAM: return 'bg-blue-100 text-blue-800'
    case UserRole.LIFELINE_LEADER: return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function UserManagement({ currentUserRole }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Edit modal state
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ email: '', displayName: '', password: '' })
  const [editRoles, setEditRoles] = useState<UserRole[]>([])
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, roleFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.data?.items || [])

    } catch (error) {
      console.error('Users error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query)
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.roles.includes(roleFilter as UserRole))
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(user => user.isActive)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(user => !user.isActive)
    }

    setFilteredUsers(filtered)
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        setUsers(prev =>
          prev.map(user =>
            user.id === userId ? { ...user, isActive: !currentStatus } : user
          )
        )
      } else {
        throw new Error('Failed to update user status')
      }
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Failed to update user status')
    }
  }

  const updateUserRoles = async (userId: string, newRoles: UserRole[]) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: newRoles }),
      })

      if (response.ok) {
        setUsers(prev =>
          prev.map(user =>
            user.id === userId ? { ...user, roles: newRoles } : user
          )
        )
      } else {
        throw new Error('Failed to update user roles')
      }
    } catch (error) {
      console.error('Error updating user roles:', error)
      alert('Failed to update user roles')
    }
  }

  const deleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? Users with associated data will be deactivated instead.')) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.message?.includes('deactivated')) {
          setUsers(prev =>
            prev.map(user =>
              user.id === userId ? { ...user, isActive: false } : user
            )
          )
          alert('User had associated data and was deactivated instead of deleted.')
        } else {
          setUsers(prev => prev.filter(user => user.id !== userId))
        }
      } else {
        throw new Error('Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setEditForm({
      email: user.email,
      displayName: user.displayName || '',
      password: '',
    })
    setEditRoles([...user.roles])
  }

  const toggleEditRole = (role: UserRole) => {
    setEditRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const saveEditUser = async () => {
    if (!editingUser) return
    setEditLoading(true)

    try {
      const payload: Record<string, any> = {}
      if (editForm.email !== editingUser.email) payload.email = editForm.email
      if (editForm.displayName !== (editingUser.displayName || '')) payload.displayName = editForm.displayName
      if (editForm.password) payload.password = editForm.password

      // Check if roles changed
      const rolesChanged = editRoles.length !== editingUser.roles.length ||
        editRoles.some(r => !editingUser.roles.includes(r))
      if (rolesChanged) {
        payload.roles = editRoles.length > 0 ? editRoles : [UserRole.MEMBER]
      }

      if (Object.keys(payload).length === 0) {
        setEditingUser(null)
        return
      }

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(prev =>
          prev.map(user =>
            user.id === editingUser.id
              ? {
                  ...user,
                  email: data.data.email,
                  displayName: data.data.displayName,
                  roles: data.data.roles,
                }
              : user
          )
        )
        setEditingUser(null)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user')
    } finally {
      setEditLoading(false)
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Crown className="h-3 w-3" />
      case UserRole.FORMATION_SUPPORT_TEAM:
        return <Shield className="h-3 w-3" />
      case UserRole.LIFELINE_LEADER:
        return <UserCheck className="h-3 w-3" />
      default:
        return <Users className="h-3 w-3" />
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'Admin'
      case UserRole.FORMATION_SUPPORT_TEAM: return 'Formation Support'
      case UserRole.LIFELINE_LEADER: return 'LifeLine Leader'
      case UserRole.MEMBER: return 'Member'
      default: return role
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p>Error loading users: {error}</p>
        </div>
        <Button onClick={fetchUsers}>
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
              <h3 className="text-2xl font-bold text-gray-900">{users.length}</h3>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {Array.isArray(users) ? users.filter(u => u.isActive).length : 0}
              </h3>
              <p className="text-sm text-gray-600">Active Users</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Crown className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {Array.isArray(users) ? users.filter(u => u.roles.includes(UserRole.LIFELINE_LEADER)).length : 0}
              </h3>
              <p className="text-sm text-gray-600">Leaders</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {Array.isArray(users) ? users.filter(u => !u.isActive).length : 0}
              </h3>
              <p className="text-sm text-gray-600">Inactive Users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="dashboard-card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={roleFilter} onChange={setRoleFilter}>
              <option value="all">All Roles</option>
              <option value={UserRole.ADMIN}>Admin</option>
              <option value={UserRole.FORMATION_SUPPORT_TEAM}>Formation Support</option>
              <option value={UserRole.LIFELINE_LEADER}>LifeLine Leader</option>
              <option value={UserRole.MEMBER}>Member</option>
            </Select>

            <Select value={statusFilter} onChange={setStatusFilter}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>

            <Link href="/register">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600">
            {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
              ? "Try adjusting your search or filters."
              : "No users have been created yet."
            }
          </p>
        </div>
      ) : (
        <div className="dashboard-card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.displayName || 'No name set'}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map(role => (
                        <span
                          key={role}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getRoleColor(role)}`}
                        >
                          {getRoleIcon(role)}
                          {getRoleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="space-y-1">
                      <div>{user._count.ledLifeLines} LifeLines</div>
                      <div>{user._count.formationRequests} Requests</div>
                      <div>{user._count.supportTickets} Tickets</div>
                      {user.lastLoginAt && (
                        <div className="text-xs">
                          Last: {formatDate(user.lastLoginAt)}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                        className={`text-xs px-2 py-1 rounded ${
                          user.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                        title={user.isActive ? 'Deactivate user' : 'Activate user'}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      {hasRole(currentUserRole, UserRole.ADMIN) && (
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-red-50"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-center text-sm text-gray-500">
        Showing {filteredUsers.length} of {Array.isArray(users) ? users.length : 0} users
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {hasRole(currentUserRole, UserRole.ADMIN) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                  <div className="space-y-2">
                    {Object.values(UserRole).map(role => (
                      <label key={role} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editRoles.includes(role)}
                          onChange={() => toggleEditRole(role)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="flex items-center gap-1 text-sm">
                          {getRoleIcon(role)}
                          {getRoleLabel(role)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter new password..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
                {editForm.password && editForm.password.length < 8 && (
                  <p className="mt-1 text-xs text-red-600">Password must be at least 8 characters</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveEditUser}
                disabled={editLoading || (editForm.password.length > 0 && editForm.password.length < 8)}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
