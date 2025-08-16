'use client'

import { useEffect } from 'react'
import { LifeLineCard } from './lifeline-card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useLifeLinesSearch } from '@/hooks/useLifeLinesSearch'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'

export function LifeLinesGrid() {
  const {
    results,
    loading,
    error,
    search,
    filters,
    hasActiveFilters,
    goToPage
  } = useLifeLinesSearch({
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  // Auto-search when component mounts if no active filters
  useEffect(() => {
    if (!hasActiveFilters && !results) {
      search({}, { updateUrl: false })
    }
  }, [hasActiveFilters, results, search])

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
        <Button
          onClick={() => search()}
        >
          Load LifeLines
        </Button>
      </div>
    )
  }

  const { items: lifeLines, totalItems, currentPage, totalPages, hasNextPage, hasPrevPage } = results

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
        {hasActiveFilters && (
          <Button
            onClick={() => search({ 
              page: 1, 
              search: undefined, 
              groupTypes: [], 
              frequencies: [], 
              agesStages: [],
              dayOfWeek: undefined,
              hasLocation: undefined,
              hasChildcare: undefined,
              isFree: undefined
            })}
            variant="outline"
          >
            Clear All Filters
          </Button>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Results Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Available LifeLines
          </h2>
          <p className="text-gray-600">
            {hasActiveFilters ? (
              <>Showing {lifeLines.length} of {totalItems} filtered result{totalItems !== 1 ? 's' : ''}</>
            ) : (
              <>Found {totalItems} group{totalItems !== 1 ? 's' : ''} for you to explore</>
            )}
          </p>
        </div>
        
        {results.metadata && (
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
        )}
      </div>

      {/* LifeLines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {lifeLines.map((lifeLine) => (
          <LifeLineCard key={lifeLine.id} lifeLine={lifeLine} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={() => goToPage(currentPage - 1)}
            disabled={!hasPrevPage}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            onClick={() => goToPage(currentPage + 1)}
            disabled={!hasNextPage}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}