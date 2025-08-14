'use client'

import { useState, useEffect } from 'react'
import { GroupType, MeetingFrequency, DayOfWeek } from '@prisma/client'
import { useLifeLinesSearch } from '@/hooks/useLifeLinesSearch'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const dayOptions = [
  { value: DayOfWeek.SUNDAY, label: 'Sunday' },
  { value: DayOfWeek.MONDAY, label: 'Monday' },
  { value: DayOfWeek.TUESDAY, label: 'Tuesday' },
  { value: DayOfWeek.WEDNESDAY, label: 'Wednesday' },
  { value: DayOfWeek.THURSDAY, label: 'Thursday' },
  { value: DayOfWeek.FRIDAY, label: 'Friday' },
  { value: DayOfWeek.SATURDAY, label: 'Saturday' },
  { value: DayOfWeek.VARIES, label: 'Varies' },
]

export function FiltersSection() {
  const {
    filters,
    facets,
    updateFilters,
    clearFilters,
    toggleFilter,
    hasActiveFilters,
    activeFilterCount
  } = useLifeLinesSearch()

  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    agesStages: true,
    groupTypes: true,
    frequencies: true,
    dayOfWeek: true
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  if (!facets) {
    return (
      <section className="bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md border p-8 max-w-6xl mx-auto text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading filters...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md border p-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-gray-900">
              LifeLine Filters
            </h3>
            {hasActiveFilters && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Ages & Stages */}
            {facets.agesStages.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('agesStages')}
                  className="flex items-center justify-between w-full text-lg font-semibold text-gray-900 mb-4 hover:text-primary"
                >
                  <span>Ages & Stages</span>
                  <span className="text-sm">
                    {expandedSections.agesStages ? '−' : '+'}
                  </span>
                </button>
                {expandedSections.agesStages && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {facets.agesStages.slice(0, 10).map((option) => (
                      <label key={option.value} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary mr-3"
                          checked={filters.agesStages?.includes(option.value) || false}
                          onChange={() => toggleFilter('agesStages', option.value)}
                        />
                        <span className="text-sm text-gray-700 flex-1">
                          {option.label} ({option.count})
                        </span>
                      </label>
                    ))}
                    {facets.agesStages.length > 10 && (
                      <button className="text-sm text-primary hover:text-primary-dark mt-2">
                        See {facets.agesStages.length - 10} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Meeting Frequency */}
            {facets.frequencies.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('frequencies')}
                  className="flex items-center justify-between w-full text-lg font-semibold text-gray-900 mb-4 hover:text-primary"
                >
                  <span>Meeting Frequency</span>
                  <span className="text-sm">
                    {expandedSections.frequencies ? '−' : '+'}
                  </span>
                </button>
                {expandedSections.frequencies && (
                  <div className="space-y-2">
                    {facets.frequencies.map((option) => (
                      <label key={option.value} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary mr-3"
                          checked={filters.frequencies?.includes(option.value as MeetingFrequency) || false}
                          onChange={() => toggleFilter('frequencies', option.value)}
                        />
                        <span className="text-sm text-gray-700 flex-1">
                          {option.label} ({option.count})
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Day of Week */}
            {facets.daysOfWeek.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('dayOfWeek')}
                  className="flex items-center justify-between w-full text-lg font-semibold text-gray-900 mb-4 hover:text-primary"
                >
                  <span>Day of the Week</span>
                  <span className="text-sm">
                    {expandedSections.dayOfWeek ? '−' : '+'}
                  </span>
                </button>
                {expandedSections.dayOfWeek && (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    value={filters.dayOfWeek || ''}
                    onChange={(e) => updateFilters({ dayOfWeek: e.target.value as DayOfWeek || undefined })}
                  >
                    <option value="">Any Day</option>
                    {dayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* LifeLine Type */}
            {facets.groupTypes.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('groupTypes')}
                  className="flex items-center justify-between w-full text-lg font-semibold text-gray-900 mb-4 hover:text-primary"
                >
                  <span>LifeLine Type</span>
                  <span className="text-sm">
                    {expandedSections.groupTypes ? '−' : '+'}
                  </span>
                </button>
                {expandedSections.groupTypes && (
                  <div className="space-y-2">
                    {facets.groupTypes.map((option) => (
                      <label key={option.value} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary mr-3"
                          checked={filters.groupTypes?.includes(option.value as GroupType) || false}
                          onChange={() => toggleFilter('groupTypes', option.value)}
                        />
                        <span className="text-sm text-gray-700 flex-1">
                          {option.label} ({option.count})
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Advanced Filters */}
          {(facets.stats.free > 0 || facets.childcare.length > 1 || facets.stats.withLocation > 0) && (
            <div className="mt-8 pt-6 border-t">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Additional Options</h4>
              <div className="flex flex-wrap gap-4">
                {facets.stats.free > 0 && (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary mr-2"
                      checked={filters.isFree || false}
                      onChange={() => toggleFilter('isFree', true)}
                    />
                    <span className="text-sm text-gray-700">
                      Free Groups ({facets.stats.free})
                    </span>
                  </label>
                )}

                {facets.childcare.find(c => c.value === true) && (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary mr-2"
                      checked={filters.hasChildcare || false}
                      onChange={() => toggleFilter('hasChildcare', true)}
                    />
                    <span className="text-sm text-gray-700">
                      Childcare Available ({facets.childcare.find(c => c.value === true)?.count || 0})
                    </span>
                  </label>
                )}

                {facets.stats.withLocation > 0 && (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary mr-2"
                      checked={filters.hasLocation || false}
                      onChange={() => toggleFilter('hasLocation', true)}
                    />
                    <span className="text-sm text-gray-700">
                      Has Meeting Location ({facets.stats.withLocation})
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Filter Actions */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
              disabled={!hasActiveFilters}
            >
              Clear all filters
            </Button>
            
            <div className="text-sm text-gray-600 font-medium">
              {!hasActiveFilters ? (
                'No filters applied'
              ) : (
                <span className="text-primary">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}