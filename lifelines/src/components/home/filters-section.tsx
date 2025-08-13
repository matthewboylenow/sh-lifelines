'use client'

import { useState } from 'react'
import { GroupType, MeetingFrequency, DayOfWeek } from '@prisma/client'

const agesStagesOptions = [
  { label: 'All Ages & Stages', count: 19 },
  { label: 'Women', count: 11 },
  { label: 'Men', count: 7 },
  { label: 'Seniors', count: 5 },
  { label: 'Dads', count: 4 },
]

const groupTypeOptions = [
  { value: GroupType.ACTIVITY, label: 'Activity', count: 14 },
  { value: GroupType.SOCIAL, label: 'Social', count: 9 },
  { value: GroupType.SCRIPTURE_BASED, label: 'Scripture-Based', count: 6 },
  { value: GroupType.SUNDAY_BASED, label: 'Sunday-Based', count: 1 },
]

const frequencyOptions = [
  { value: MeetingFrequency.MONTHLY, label: 'Monthly', count: 18 },
  { value: MeetingFrequency.WEEKLY, label: 'Weekly', count: 8 },
  { value: MeetingFrequency.SEASONALLY, label: 'Seasonally', count: 4 },
]

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

interface Filters {
  agesStages: string[]
  groupTypes: GroupType[]
  frequencies: MeetingFrequency[]
  dayOfWeek?: DayOfWeek
}

export function FiltersSection() {
  const [filters, setFilters] = useState<Filters>({
    agesStages: [],
    groupTypes: [],
    frequencies: [],
  })

  const handleAgesStagesChange = (age: string) => {
    setFilters(prev => ({
      ...prev,
      agesStages: prev.agesStages.includes(age)
        ? prev.agesStages.filter(a => a !== age)
        : [...prev.agesStages, age]
    }))
  }

  const handleGroupTypeChange = (groupType: GroupType) => {
    setFilters(prev => ({
      ...prev,
      groupTypes: prev.groupTypes.includes(groupType)
        ? prev.groupTypes.filter(g => g !== groupType)
        : [...prev.groupTypes, groupType]
    }))
  }

  const handleFrequencyChange = (frequency: MeetingFrequency) => {
    setFilters(prev => ({
      ...prev,
      frequencies: prev.frequencies.includes(frequency)
        ? prev.frequencies.filter(f => f !== frequency)
        : [...prev.frequencies, frequency]
    }))
  }

  const clearFilters = () => {
    setFilters({ agesStages: [], groupTypes: [], frequencies: [] })
  }

  return (
    <section className="bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md border p-8 max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            LifeLine Filters
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Ages & Stages */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">Ages & Stages:</label>
              <div className="space-y-2">
                {agesStagesOptions.map((option) => (
                  <label key={option.label} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                      checked={filters.agesStages.includes(option.label)}
                      onChange={() => handleAgesStagesChange(option.label)}
                    />
                    <span className="text-sm text-gray-700">
                      {option.label} ({option.count})
                    </span>
                  </label>
                ))}
                <button className="text-sm text-blue-600 hover:text-blue-800 mt-2">
                  See 2 more
                </button>
              </div>
            </div>

            {/* Meeting Frequency */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">Meeting Frequency:</label>
              <div className="space-y-2">
                {frequencyOptions.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                      checked={filters.frequencies.includes(option.value)}
                      onChange={() => handleFrequencyChange(option.value)}
                    />
                    <span className="text-sm text-gray-700">
                      {option.label} ({option.count})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Day of Week */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">Day of the Week:</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={filters.dayOfWeek || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dayOfWeek: e.target.value as DayOfWeek || undefined 
                }))}
              >
                <option value="">Any</option>
                {dayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* LifeLine Type */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">LifeLine Type:</label>
              <div className="space-y-2">
                {groupTypeOptions.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                      checked={filters.groupTypes.includes(option.value)}
                      onChange={() => handleGroupTypeChange(option.value)}
                    />
                    <span className="text-sm text-gray-700">
                      {option.label} ({option.count})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Clear all filters
            </button>
            
            <div className="text-sm text-gray-600 font-medium">
              {filters.agesStages.length === 0 && filters.groupTypes.length === 0 && filters.frequencies.length === 0 && !filters.dayOfWeek
                ? 'No filters applied'
                : `Filters applied`
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}