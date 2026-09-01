'use client'

import { GroupType, MeetingFrequency, DayOfWeek } from '@prisma/client'
import { X } from 'lucide-react'
import { useSharedSearch } from './lifelines-search-context'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const dayLabels: Record<string, string> = {
  [DayOfWeek.SUNDAY]: 'Sunday',
  [DayOfWeek.MONDAY]: 'Monday',
  [DayOfWeek.TUESDAY]: 'Tuesday',
  [DayOfWeek.WEDNESDAY]: 'Wednesday',
  [DayOfWeek.THURSDAY]: 'Thursday',
  [DayOfWeek.FRIDAY]: 'Friday',
  [DayOfWeek.SATURDAY]: 'Saturday',
  [DayOfWeek.VARIES]: 'Varies',
}

interface FacetOption {
  value: string | boolean
  label: string
  count: number
}

/**
 * One choice. A toggle button rather than a checkbox: every option fits on
 * screen as a chip, so nothing is hidden behind a scrollbar.
 */
function FilterChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string
  count?: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1 ${
        selected
          ? 'border-primary-500 bg-primary-500 text-white shadow-sm'
          : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className={selected ? 'text-white/70' : 'text-gray-400'}>{count}</span>
      )}
    </button>
  )
}

function FilterGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function FiltersSection() {
  const {
    filters,
    facets,
    updateFilters,
    clearFilters,
    toggleFilter,
    hasActiveFilters,
    activeFilterCount,
  } = useSharedSearch()

  if (!facets) {
    return (
      <section className="section-alt">
        <div className="container mx-auto px-4">
          <div className="dashboard-card p-8 max-w-6xl mx-auto text-center">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600">Loading filters...</p>
          </div>
        </div>
      </section>
    )
  }

  const labelFor = (options: FacetOption[], value: unknown) =>
    options.find(o => o.value === value)?.label ?? String(value)

  // A filter can arrive as a bare string — someone typing ?agesStages=Women in
  // the URL, or older links. Treat any single value as a list of one rather
  // than calling .map on a string.
  const asList = (value: unknown): string[] =>
    Array.isArray(value) ? value : value == null || value === '' ? [] : [String(value)]

  // Everything currently narrowing the results, so it can be seen and undone
  // in one place rather than hunted for among the groups.
  const activeChips: { key: string; label: string; remove: () => void }[] = [
    ...asList(filters.agesStages).map(v => ({
      key: `ages-${v}`,
      label: labelFor(facets.agesStages, v),
      remove: () => toggleFilter('agesStages', v),
    })),
    ...asList(filters.groupTypes).map(v => ({
      key: `type-${v}`,
      label: labelFor(facets.groupTypes, v),
      remove: () => toggleFilter('groupTypes', v),
    })),
    ...asList(filters.frequencies).map(v => ({
      key: `freq-${v}`,
      label: labelFor(facets.frequencies, v),
      remove: () => toggleFilter('frequencies', v),
    })),
    ...(filters.dayOfWeek
      ? [{
          key: `day-${filters.dayOfWeek}`,
          label: dayLabels[filters.dayOfWeek] ?? String(filters.dayOfWeek),
          remove: () => updateFilters({ dayOfWeek: undefined }),
        }]
      : []),
    ...(filters.hasChildcare
      ? [{
          key: 'childcare',
          label: 'Childcare available',
          remove: () => toggleFilter('hasChildcare', true),
        }]
      : []),
  ]

  const childcareCount = facets.childcare.find(c => c.value === true)?.count

  return (
    <section className="section-alt">
      <div className="container mx-auto px-4">
        <div className="dashboard-card-gradient p-6 sm:p-8 max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h3 className="section-heading text-2xl">Find Your LifeLine</h3>
            {hasActiveFilters && (
              <Button onClick={() => clearFilters()} variant="outline" size="sm">
                Clear all
              </Button>
            )}
          </div>

          {/* What is narrowing the list right now */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6 pb-6 border-b border-gray-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1">
                Showing
              </span>
              {activeChips.map(chip => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.remove}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:ring-offset-1"
                >
                  {chip.label}
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">Remove this filter</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-7">
            {facets.agesStages.length > 0 && (
              <FilterGroup title="Ages &amp; Stages">
                {facets.agesStages.map(option => (
                  <FilterChip
                    key={String(option.value)}
                    label={option.label}
                    count={option.count}
                    selected={asList(filters.agesStages).includes(String(option.value))}
                    onClick={() => toggleFilter('agesStages', option.value)}
                  />
                ))}
              </FilterGroup>
            )}

            {facets.daysOfWeek.length > 0 && (
              <FilterGroup title="Day of the Week">
                {facets.daysOfWeek.map(option => (
                  <FilterChip
                    key={String(option.value)}
                    label={dayLabels[String(option.value)] ?? option.label}
                    count={option.count}
                    selected={filters.dayOfWeek === option.value}
                    onClick={() =>
                      updateFilters({
                        dayOfWeek:
                          filters.dayOfWeek === option.value
                            ? undefined
                            : (option.value as DayOfWeek),
                      })
                    }
                  />
                ))}
              </FilterGroup>
            )}

            {facets.groupTypes.length > 0 && (
              <FilterGroup title="LifeLine Type">
                {facets.groupTypes.map(option => (
                  <FilterChip
                    key={String(option.value)}
                    label={option.label}
                    count={option.count}
                    selected={asList(filters.groupTypes).includes(String(option.value))}
                    onClick={() => toggleFilter('groupTypes', option.value)}
                  />
                ))}
              </FilterGroup>
            )}

            {(facets.frequencies.length > 0 || childcareCount) && (
              <FilterGroup title="Meeting Frequency">
                {facets.frequencies.map(option => (
                  <FilterChip
                    key={String(option.value)}
                    label={option.label}
                    count={option.count}
                    selected={asList(filters.frequencies).includes(String(option.value))}
                    onClick={() => toggleFilter('frequencies', option.value)}
                  />
                ))}
                {childcareCount ? (
                  <FilterChip
                    label="Childcare available"
                    count={childcareCount}
                    selected={filters.hasChildcare || false}
                    onClick={() => toggleFilter('hasChildcare', true)}
                  />
                ) : null}
              </FilterGroup>
            )}
          </div>

          <div className="mt-7 pt-5 border-t border-gray-200 text-sm text-gray-600">
            {hasActiveFilters ? (
              <span>
                <span className="font-semibold text-primary-700">{activeFilterCount}</span>{' '}
                filter{activeFilterCount !== 1 ? 's' : ''} applied
              </span>
            ) : (
              'Choose any combination above to narrow the list.'
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
