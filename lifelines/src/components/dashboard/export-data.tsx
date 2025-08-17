'use client'

import { useState } from 'react'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Download, FileText, Users, MessageSquare, Ticket, UserPlus, Calendar } from 'lucide-react'

interface ExportDataProps {
  userRole: UserRole
}

interface ExportOption {
  id: string
  label: string
  description: string
  endpoint: string
  icon: any
  filename: string
}

const exportOptions: ExportOption[] = [
  {
    id: 'lifelines',
    label: 'LifeLines Data',
    description: 'All LifeLines with details, leaders, and schedules',
    endpoint: '/api/export/lifelines',
    icon: Users,
    filename: 'lifelines-export.csv'
  },
  {
    id: 'inquiries',
    label: 'Member Inquiries',
    description: 'All member inquiries and their status',
    endpoint: '/api/export/inquiries',
    icon: MessageSquare,
    filename: 'inquiries-export.csv'
  },
  {
    id: 'formation-requests',
    label: 'Formation Requests',
    description: 'Formation requests and approval status',
    endpoint: '/api/export/formation-requests',
    icon: FileText,
    filename: 'formation-requests-export.csv'
  },
  {
    id: 'support-tickets',
    label: 'Support Tickets',
    description: 'All support tickets and responses',
    endpoint: '/api/export/support-tickets',
    icon: Ticket,
    filename: 'support-tickets-export.csv'
  },
  {
    id: 'users',
    label: 'User Accounts',
    description: 'User accounts and role information',
    endpoint: '/api/export/users',
    icon: UserPlus,
    filename: 'users-export.csv'
  }
]

export function ExportData({ userRole }: ExportDataProps) {
  const [selectedExports, setSelectedExports] = useState<string[]>([])
  const [exporting, setExporting] = useState<string[]>([])
  const [exportHistory, setExportHistory] = useState<Array<{ id: string; filename: string; timestamp: Date }>>([])

  const handleExportToggle = (exportId: string) => {
    setSelectedExports(prev => 
      prev.includes(exportId) 
        ? prev.filter(id => id !== exportId)
        : [...prev, exportId]
    )
  }

  const handleSingleExport = async (option: ExportOption) => {
    try {
      setExporting(prev => [...prev, option.id])
      
      const response = await fetch(option.endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = option.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Add to export history
      setExportHistory(prev => [
        { id: option.id, filename: option.filename, timestamp: new Date() },
        ...prev.slice(0, 9) // Keep last 10 exports
      ])

    } catch (error) {
      console.error('Export error:', error)
      alert(`Failed to export ${option.label}`)
    } finally {
      setExporting(prev => prev.filter(id => id !== option.id))
    }
  }

  const handleBulkExport = async () => {
    if (selectedExports.length === 0) return

    try {
      setExporting(prev => [...prev, 'bulk'])
      
      const response = await fetch('/api/export/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exports: selectedExports }),
      })

      if (!response.ok) {
        throw new Error('Bulk export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `lifelines-bulk-export-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Clear selections after successful export
      setSelectedExports([])

    } catch (error) {
      console.error('Bulk export error:', error)
      alert('Failed to create bulk export')
    } finally {
      setExporting(prev => prev.filter(id => id !== 'bulk'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Export Section */}
      <div className="dashboard-card bg-gradient-to-r from-primary-50 to-secondary-50">
        <div className="flex items-start gap-4">
          <div className="bg-primary-100 p-3 rounded-lg">
            <Download className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Export</h3>
            <p className="text-gray-600 mb-4">
              Export multiple datasets at once as a ZIP file, or download individual CSV files.
            </p>
            {selectedExports.length > 0 && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleBulkExport}
                  disabled={exporting.includes('bulk')}
                >
                  {exporting.includes('bulk') ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export {selectedExports.length} Selected ({selectedExports.length === 1 ? 'ZIP' : 'ZIP'})
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedExports([])}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportOptions.map(option => {
          const IconComponent = option.icon
          const isExporting = exporting.includes(option.id)
          const isSelected = selectedExports.includes(option.id)
          
          return (
            <div key={option.id} className="dashboard-card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <Checkbox
                  checked={isSelected}
                  onChange={() => handleExportToggle(option.id)}
                  disabled={isExporting}
                />
                <div className="bg-gray-100 p-2 rounded-lg">
                  <IconComponent className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{option.label}</h3>
                  <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSingleExport(option)}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <>
                          <LoadingSpinner className="w-3 h-3 mr-2" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3 mr-2" />
                          Export CSV
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-gray-500">{option.filename}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <div className="dashboard-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Exports</h3>
          <div className="space-y-2">
            {exportHistory.map((export_, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">{export_.filename}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {export_.timestamp.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Instructions */}
      <div className="dashboard-card border-l-4 border-l-blue-500">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Export Information</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• <strong>CSV files</strong> can be opened in Excel, Google Sheets, or any spreadsheet application</p>
              <p>• <strong>Bulk exports</strong> are delivered as ZIP files containing multiple CSV files</p>
              <p>• All exports include column headers and are formatted for easy analysis</p>
              <p>• Personal information is included only for authorized roles</p>
              <p>• Contact data may be redacted based on privacy settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Note */}
      {userRole === UserRole.ADMIN && (
        <div className="dashboard-card bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Administrator Access</h3>
              <p className="text-sm text-gray-600">
                As an administrator, you have access to export all data types including sensitive user information. 
                Please ensure proper data handling and privacy compliance when sharing exported data.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}