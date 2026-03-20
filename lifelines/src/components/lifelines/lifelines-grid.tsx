'use client'

import { useEffect, useMemo } from 'react'
import { LifeLineCard } from './lifeline-card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSharedSearch } from '@/components/home/lifelines-search-context'
import { Button } from '@/components/ui/Button'
import { RotateCcw } from 'lucide-react'
import { LifeLineWithLeader } from '@/types'

// Weighted random shuffle: newer items get slightly higher priority
function weightedShuffle(items: LifeLineWithLeader[]): LifeLineWithLeader[] {
  if (items.length === 0) return items
  const now = Date.now()
  const DAY_MS = 86400000
  const weighted = items.map(item => {
    const ageInDays = (now - new Date(item.createdAt).getTime()) / DAY_MS
    // Recent items (< 30 days) get up to 3x weight; older items approach 1x
    const recencyWeight = 1 + 2 * Math.max(0, 1 - ageInDays / 30)
    return { item, sort: Math.random() * recencyWeight }
  })
  weighted.sort((a, b) => b.sort - a.sort)
  return weighted.map(w => w.item)
}

export function LifeLinesGrid() {
  const {
    results,
    loading,
    error,
    search,
    hasActiveFilters,
  } = useSharedSearch()

  // Auto-search on mount
  useEffect(() => {
    if (!results) {
      search({}, { updateUrl: false })
    }
  }, [results, search])

  // Shuffle results with recency weighting (stable per page load)
  const shuffledItems = useMemo(() => {
    if (!results?.items) return []
    return weightedShuffle([...results.items])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results?.items?.length, results?.totalItems])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
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
        <Button
          onClick={() => search()}
          className="flex items-center"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No search results yet. Try adjusting your filters or search terms.</p>
        <Button onClick={() => search()}>
          Load LifeLines
        </Button>
      </div>
    )
  }

  const lifeLines = shuffledItems
  const totalItems = results.totalItems

  if (lifeLines.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No LifeLines Found</h2>
        <p className="text-gray-600 mb-8">
          {hasActiveFilters
            ? 'No groups match your current filters. Try adjusting your search criteria.'
            : 'No LifeLines are currently available.'
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {hasActiveFilters && (
            <Button
              onClick={() => search({
                page: 1,
                search: undefined,
                groupTypes: [],
                frequencies: [],
                agesStages: [],
                dayOfWeek: undefined,
                hasChildcare: undefined,
              })}
              variant="outline"
            >
              Clear All Filters
            </Button>
          )}
          <a
            href="https://sainthelen.org/lifelines"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
          >
            Don't See A LifeLine You're Interested In? Start A LifeLine!
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* LifeLines Grid - 2 columns on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {lifeLines.map((lifeLine) => (
          <LifeLineCard key={lifeLine.id} lifeLine={lifeLine} />
        ))}
      </div>
    </div>
  )
}
