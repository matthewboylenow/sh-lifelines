'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, Trash2, Check, AlertTriangle, Info, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ImportStep {
  id: string
  title: string
  description: string
  completed: boolean
}

interface FieldMapping {
  source: string
  target: string
  required: boolean
  type: 'text' | 'number' | 'boolean' | 'date' | 'email' | 'array'
  transform?: string
}

interface ImportData {
  filename: string
  data: any[]
  headers: string[]
  preview: any[]
}

const LIFELINE_FIELD_MAPPINGS: FieldMapping[] = [
  { source: '', target: 'title', required: true, type: 'text' },
  { source: '', target: 'description', required: false, type: 'text' },
  { source: '', target: 'subtitle', required: false, type: 'text' },
  { source: '', target: 'groupLeader', required: true, type: 'text' },
  { source: '', target: 'dayOfWeek', required: false, type: 'text' },
  { source: '', target: 'meetingTime', required: false, type: 'text' },
  { source: '', target: 'location', required: false, type: 'text' },
  { source: '', target: 'meetingFrequency', required: false, type: 'text' },
  { source: '', target: 'groupType', required: false, type: 'text' },
  { source: '', target: 'agesStages', required: false, type: 'array' },
  { source: '', target: 'maxParticipants', required: false, type: 'number' },
  { source: '', target: 'duration', required: false, type: 'text' },
  { source: '', target: 'cost', required: false, type: 'number' },
  { source: '', target: 'childcare', required: false, type: 'boolean' },
  { source: '', target: 'imageUrl', required: false, type: 'text' },
  { source: '', target: 'status', required: false, type: 'text' },
]

type DuplicateHandling = 'skip' | 'update' | 'replace_all'

export function WordPressImportWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [importData, setImportData] = useState<ImportData | null>(null)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(LIFELINE_FIELD_MAPPINGS)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>('skip')
  const [clearExisting, setClearExisting] = useState(false)

  const steps: ImportStep[] = [
    {
      id: 'upload',
      title: 'Upload Data File',
      description: 'Upload your WordPress export (JSON/CSV) file',
      completed: !!importData
    },
    {
      id: 'mapping',
      title: 'Map Fields',
      description: 'Map your WordPress fields to LifeLines fields',
      completed: fieldMappings.filter(f => f.required).every(f => f.source)
    },
    {
      id: 'preview',
      title: 'Preview & Confirm',
      description: 'Review your data before importing',
      completed: false
    },
    {
      id: 'import',
      title: 'Import Data',
      description: 'Process and import your LifeLines',
      completed: !!importResult
    }
  ]

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let data: any[]
        let headers: string[]

        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(e.target?.result as string)
          data = Array.isArray(jsonData) ? jsonData : [jsonData]
          headers = data.length > 0 ? Object.keys(data[0]) : []
        } else if (file.name.endsWith('.csv')) {
          const csvText = e.target?.result as string
          const lines = csvText.split('\n').filter(line => line.trim())
          headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
          data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
            const row: any = {}
            headers.forEach((header, index) => {
              row[header] = values[index] || ''
            })
            return row
          })
        } else {
          alert('Please upload a JSON or CSV file')
          return
        }

        setImportData({
          filename: file.name,
          data,
          headers,
          preview: data.slice(0, 5) // First 5 rows for preview
        })

        // Auto-map common field names
        const updatedMappings = fieldMappings.map(mapping => {
          const possibleMatches = headers.filter(header => {
            const headerLower = header.toLowerCase()
            const targetLower = mapping.target.toLowerCase()
            return headerLower.includes(targetLower) || 
                   targetLower.includes(headerLower) ||
                   (mapping.target === 'title' && (headerLower.includes('post_title') || headerLower.includes('name'))) ||
                   (mapping.target === 'description' && (headerLower.includes('post_content') || headerLower.includes('content'))) ||
                   (mapping.target === 'groupLeader' && (headerLower.includes('leader') || headerLower.includes('author'))) ||
                   (mapping.target === 'location' && headerLower.includes('location')) ||
                   (mapping.target === 'dayOfWeek' && headerLower.includes('day')) ||
                   (mapping.target === 'meetingTime' && headerLower.includes('time'))
          })
          
          return {
            ...mapping,
            source: possibleMatches[0] || ''
          }
        })
        setFieldMappings(updatedMappings)
        
      } catch (error) {
        alert('Error parsing file. Please check the format.')
        console.error('File parsing error:', error)
      }
    }
    reader.readAsText(file)
  }, [fieldMappings])

  const handleMappingChange = (index: number, sourceField: string) => {
    const updatedMappings = [...fieldMappings]
    updatedMappings[index].source = sourceField
    setFieldMappings(updatedMappings)
  }

  const handleImport = async () => {
    if (!importData) return

    setIsImporting(true)
    try {
      // Transform data based on field mappings
      const transformedData = importData.data.map(row => {
        const transformed: any = {}
        fieldMappings.forEach(mapping => {
          if (mapping.source && row[mapping.source] !== undefined) {
            let value = row[mapping.source]
            
            // Apply type transformations
            switch (mapping.type) {
              case 'number':
                value = parseFloat(value) || 0
                break
              case 'boolean':
                value = ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase())
                break
              case 'array':
                value = typeof value === 'string' ? value.split(',').map(v => v.trim()) : []
                break
              case 'date':
                value = new Date(value).toISOString()
                break
            }
            
            transformed[mapping.target] = value
          }
        })
        return transformed
      })

      // Import the data with options
      const response = await fetch('/api/admin/import/lifelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: transformedData,
          clearExisting: clearExisting,
          duplicateHandling: duplicateHandling,
        }),
      })

      if (!response.ok) {
        throw new Error('Import failed')
      }

      const result = await response.json()
      setImportResult(result)
      setCurrentStep(3)
      
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed. Please check your data and try again.')
    } finally {
      setIsImporting(false)
    }
  }

  const generateTemplate = () => {
    const template = fieldMappings.reduce((acc, mapping) => {
      acc[mapping.target] = mapping.type === 'array' ? 'value1,value2' : 
                           mapping.type === 'number' ? '0' :
                           mapping.type === 'boolean' ? 'true' :
                           mapping.type === 'date' ? '2024-01-01' :
                           'Sample value'
      return acc
    }, {} as any)

    const csvContent = [
      Object.keys(template).join(','),
      Object.values(template).join(',')
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lifelines-import-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex-1 relative">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  index <= currentStep 
                    ? 'bg-primary-500 border-primary-500 text-white' 
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  {step.completed ? <Check className="h-5 w-5" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 ml-4 ${
                    index < currentStep ? 'bg-primary-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Data</h2>
              <p className="text-gray-600 mb-6">
                Upload a JSON or CSV file exported from WordPress with your LifeLines data.
              </p>
            </div>

            {!importData ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-primary-600 hover:text-primary-700 font-medium">
                      Click to upload
                    </span>
                    <span className="text-gray-600"> or drag and drop</span>
                  </label>
                  <p className="text-sm text-gray-500">JSON or CSV files only</p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-green-900">{importData.filename}</p>
                      <p className="text-sm text-green-700">{importData.data.length} records found</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setImportData(null)}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Need a template?</p>
                  <p className="mb-2">Download our template file to see the expected format.</p>
                  <Button onClick={generateTemplate} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {importData && (
              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep(1)}>
                  Next: Map Fields
                </Button>
              </div>
            )}
          </div>
        )}

        {currentStep === 1 && importData && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Map Your Fields</h2>
              <p className="text-gray-600">
                Match your WordPress fields to the corresponding LifeLines fields.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Available source fields:</p>
                  <p className="mt-1">{importData.headers.join(', ')}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {fieldMappings.map((mapping, index) => (
                <div key={mapping.target} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-900">
                      {mapping.target}
                      {mapping.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <span className="text-xs text-gray-500">{mapping.type}</span>
                  </div>
                  <select
                    value={mapping.source}
                    onChange={(e) => handleMappingChange(index, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      mapping.required && !mapping.source ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select source field...</option>
                    {importData.headers.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep(0)} variant="outline">
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={fieldMappings.filter(f => f.required).some(f => !f.source)}
              >
                Next: Preview Data
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && importData && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Preview & Confirm</h2>
              <p className="text-gray-600">
                Review a sample of your data before importing {importData.data.length} records.
              </p>
            </div>

            {/* Import Options */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Import Options</h3>

              {/* Duplicate Handling */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How should duplicates be handled? (matched by title)
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="duplicateHandling"
                      value="skip"
                      checked={duplicateHandling === 'skip'}
                      onChange={() => setDuplicateHandling('skip')}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      <strong>Skip duplicates</strong> - Keep existing records, only import new ones
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="duplicateHandling"
                      value="update"
                      checked={duplicateHandling === 'update'}
                      onChange={() => setDuplicateHandling('update')}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      <strong>Update existing</strong> - Update matching records with imported data
                    </span>
                  </label>
                </div>
              </div>

              {/* Clear Existing Option */}
              <div className="pt-2 border-t border-gray-200">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={clearExisting}
                    onChange={(e) => setClearExisting(e.target.checked)}
                    className="mt-1 mr-3 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-red-700">
                      Clear all existing data before import
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      This will delete ALL existing LifeLines, inquiries, and related data. Use with caution.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {clearExisting && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Warning: This will delete all existing data.</p>
                    <p className="mt-1">All current LifeLines, inquiries, and related records will be permanently removed.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    {fieldMappings.filter(m => m.source).map(mapping => (
                      <th key={mapping.target} className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b border-gray-200">
                        {mapping.target}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importData.preview.map((row, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      {fieldMappings.filter(m => m.source).map(mapping => (
                        <td key={mapping.target} className="px-4 py-2 text-sm text-gray-900">
                          {String(row[mapping.source] || '').substring(0, 50)}
                          {String(row[mapping.source] || '').length > 50 && '...'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep(1)} variant="outline">
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className={clearExisting ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {isImporting ? 'Importing...' : clearExisting ? 'Clear & Import Data' : 'Import Data'}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && importResult && (
          <div className="space-y-6 text-center">
            <div>
              <Check className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h2>
              <p className="text-gray-600">
                Your WordPress data has been successfully imported.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{importResult.imported || 0}</p>
                  <p className="text-sm text-green-800">Imported</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{importResult.skipped || 0}</p>
                  <p className="text-sm text-yellow-800">Skipped</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{importResult.errors || 0}</p>
                  <p className="text-sm text-red-800">Errors</p>
                </div>
              </div>
            </div>

            {importResult.details && importResult.details.length > 0 && (
              <div className="text-left">
                <h3 className="font-medium text-gray-900 mb-2">Import Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {importResult.details.map((detail: any, index: number) => (
                    <div key={index} className="text-sm mb-1">
                      <span className={`font-medium ${
                        detail.status === 'imported' ? 'text-green-600' :
                        detail.status === 'skipped' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {detail.status.toUpperCase()}
                      </span>
                      <span className="text-gray-600 ml-2">{detail.identifier}: {detail.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={() => window.location.href = '/dashboard/admin'}>
                Go to Admin Dashboard
              </Button>
              <br />
              <Button 
                onClick={() => {
                  setCurrentStep(0)
                  setImportData(null)
                  setImportResult(null)
                  setFieldMappings(LIFELINE_FIELD_MAPPINGS)
                }}
                variant="outline"
              >
                Import More Data
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}