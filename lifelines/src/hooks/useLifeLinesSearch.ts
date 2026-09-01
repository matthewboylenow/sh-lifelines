'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LifeLineWithLeader } from '@/types'
import { GroupType, MeetingFrequency, DayOfWeek, LifeLineStatus } from '@prisma/client'

export interface SearchFilters {
  // Basic filters
  status?: LifeLineStatus
  groupType?: GroupType
  meetingFrequency?: MeetingFrequency
  dayOfWeek?: DayOfWeek
  leaderId?: string
  
  // Array filters
  agesStages?: string[]
  groupTypes?: GroupType[]
  frequencies?: MeetingFrequency[]
  
  // Search and text filters
  search?: string
  title?: string
  description?: string
  leader?: string
  
  // Meeting details
  location?: string
  hasLocation?: boolean
  hasChildcare?: boolean
  
  // Cost filters
  isFree?: boolean
  maxCost?: number
  
  // Capacity filters
  hasSpace?: boolean
  maxParticipants?: number
  
  // Advanced search options
  exactMatch?: boolean
  searchFields?: string[]
  
  // Sorting
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  
  // Pagination
  page?: number
  limit?: number
}

export interface SearchMetadata {
  appliedFilters: Record<string, any>
  totalFiltersApplied: number
  hasSearch: boolean
  hasFilters: boolean
  sortedBy: string
  sortOrder: 'asc' | 'desc'
}

export interface SearchResponse {
  items: LifeLineWithLeader[]
  totalItems: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  metadata?: SearchMetadata
}

export interface SearchFacets {
  groupTypes: Array<{ value: string, label: string, count: number }>
  frequencies: Array<{ value: string, label: string, count: number }>
  daysOfWeek: Array<{ value: string, label: string, count: number }>
  agesStages: Array<{ value: string, label: string, count: number }>
  statuses: Array<{ value: string, label: string, count: number }>
  locations: Array<{ value: string, label: string, count: number }>
  leaders: Array<{ value: string, label: string, count: number }>
  childcare: Array<{ value: boolean, label: string, count: number }>
  stats: {
    total: number
    free: number
    withLocation: number
    costRange: { min: number, max: number, average: number }
    participantsRange: { min: number, max: number, average: number }
  }
}

export interface SearchSuggestion {
  id?: string
  text: string
  type: 'title' | 'leader' | 'location' | 'agesStage' | 'popular'
  category: string
  metadata?: Record<string, any>
}

/** Filters that hold a list of values rather than a single one. */
const MULTI_VALUE_FILTERS = ['agesStages', 'groupTypes', 'frequencies', 'searchFields']

export function useLifeLinesSearch(initialFilters: SearchFilters = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Callers pass this as an object literal, so it is a new reference on every
  // render. Held in a ref so the effects below can depend on the URL alone
  // without re-running forever.
  const defaults = useRef(initialFilters)
  
  // Parse initial filters from URL parameters
  const getFiltersFromUrl = useCallback((): SearchFilters => {
    const urlFilters: SearchFilters = {}
    
    // Parse search parameters
    if (searchParams.get('search')) urlFilters.search = searchParams.get('search')!
    if (searchParams.get('groupType')) urlFilters.groupType = searchParams.get('groupType') as GroupType
    if (searchParams.get('meetingFrequency')) urlFilters.meetingFrequency = searchParams.get('meetingFrequency') as MeetingFrequency
    if (searchParams.get('dayOfWeek')) urlFilters.dayOfWeek = searchParams.get('dayOfWeek') as DayOfWeek
    if (searchParams.get('leaderId')) urlFilters.leaderId = searchParams.get('leaderId')!
    if (searchParams.get('location')) urlFilters.location = searchParams.get('location')!
    if (searchParams.get('leader')) urlFilters.leader = searchParams.get('leader')!
    
    // Parse array parameters
    if (searchParams.get('agesStages')) {
      urlFilters.agesStages = searchParams.get('agesStages')!.split(',').filter(Boolean)
    }
    if (searchParams.get('groupTypes')) {
      urlFilters.groupTypes = searchParams.get('groupTypes')!.split(',').filter(Boolean) as GroupType[]
    }
    if (searchParams.get('frequencies')) {
      urlFilters.frequencies = searchParams.get('frequencies')!.split(',').filter(Boolean) as MeetingFrequency[]
    }
    
    // Parse boolean parameters
    if (searchParams.get('hasLocation') === 'true') urlFilters.hasLocation = true
    if (searchParams.get('hasChildcare') === 'true') urlFilters.hasChildcare = true
    if (searchParams.get('isFree') === 'true') urlFilters.isFree = true
    if (searchParams.get('hasSpace') === 'true') urlFilters.hasSpace = true
    if (searchParams.get('exactMatch') === 'true') urlFilters.exactMatch = true
    
    // Parse numeric parameters
    if (searchParams.get('maxCost')) urlFilters.maxCost = parseFloat(searchParams.get('maxCost')!)
    if (searchParams.get('maxParticipants')) urlFilters.maxParticipants = parseInt(searchParams.get('maxParticipants')!)
    if (searchParams.get('page')) urlFilters.page = parseInt(searchParams.get('page')!)
    if (searchParams.get('limit')) urlFilters.limit = parseInt(searchParams.get('limit')!)
    
    // Parse sorting
    if (searchParams.get('sortBy')) urlFilters.sortBy = searchParams.get('sortBy')!
    if (searchParams.get('sortOrder')) urlFilters.sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc'
    
    // Parse search fields
    if (searchParams.get('searchFields')) {
      urlFilters.searchFields = searchParams.get('searchFields')!.split(',').filter(Boolean)
    }
    
    return urlFilters
  }, [searchParams])
  
  // State
  const [filters, setFilters] = useState<SearchFilters>(() => ({ ...initialFilters, ...getFiltersFromUrl() }))
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [facets, setFacets] = useState<SearchFacets | null>(null)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  
  // Update filters from URL when search params change.
  //
  // The caller's defaults have to be laid down first. This used to replace the
  // whole filter set with whatever the URL held, so on a clean homepage — where
  // the URL carries nothing — the page size the caller asked for was thrown
  // away and the API fell back to its default of 10. The homepage asks for 200
  // because it shows every group at once.
  useEffect(() => {
    setFilters({ ...defaults.current, ...getFiltersFromUrl() })
  }, [getFiltersFromUrl])
  
  // Build query string from filters
  const buildQueryString = useCallback((filterOverrides: SearchFilters = {}): string => {
    const mergedFilters = { ...filters, ...filterOverrides }
    const params = new URLSearchParams()
    
    Object.entries(mergedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          params.set(key, value.join(','))
        } else if (typeof value === 'boolean') {
          params.set(key, value.toString())
        } else if (typeof value === 'number') {
          params.set(key, value.toString())
        } else if (typeof value === 'string') {
          params.set(key, value)
        }
      }
    })
    
    return params.toString()
  }, [filters])
  
  // Search function
  const search = useCallback(async (filterOverrides: SearchFilters = {}, options?: { updateUrl?: boolean }) => {
    try {
      setLoading(true)
      setError(null)
      
      const queryString = buildQueryString(filterOverrides)
      const response = await fetch(`/api/lifelines?${queryString}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to search LifeLines')
      }
      
      setResults(data.data)
      
      // Update URL if requested
      if (options?.updateUrl !== false) {
        const newUrl = queryString ? `?${queryString}` : '/'
        router.push(newUrl, { scroll: false })
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }, [buildQueryString, router])
  
  // Load facets
  const loadFacets = useCallback(async () => {
    try {
      const response = await fetch('/api/lifelines/search-facets')
      const data = await response.json()
      
      if (response.ok) {
        setFacets(data.data)
      }
    } catch (err) {
      console.error('Failed to load facets:', err)
    }
  }, [])
  
  // Get suggestions
  const getSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      return
    }
    
    try {
      setSuggestionsLoading(true)
      const response = await fetch(`/api/lifelines/search-suggestions?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      
      if (response.ok) {
        setSuggestions(data.data.suggestions || [])
      }
    } catch (err) {
      console.error('Failed to get suggestions:', err)
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])
  
  // Update filters
  const updateFilters = useCallback((updates: SearchFilters, options?: { search?: boolean, updateUrl?: boolean }) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)
    
    if (options?.search !== false) {
      search(updates, { updateUrl: options?.updateUrl })
    }
  }, [filters, search])
  
  // Clear filters
  const clearFilters = useCallback((options?: { search?: boolean }) => {
    const clearedFilters: SearchFilters = {
      page: 1,
      // Keep the page size the caller asked for; clearing filters should not
      // quietly shrink the list.
      limit: filters.limit || defaults.current.limit || 12,
      sortBy: defaults.current.sortBy || 'createdAt',
      sortOrder: defaults.current.sortOrder || 'desc'
    }
    setFilters(clearedFilters)
    
    if (options?.search !== false) {
      search(clearedFilters)
    }
  }, [filters.limit, search])
  
  // Reset to page 1 when filters change (except pagination)
  const resetPage = useCallback((updates: SearchFilters) => {
    const hasNonPaginationChanges = Object.keys(updates).some(key => key !== 'page' && key !== 'limit')
    if (hasNonPaginationChanges) {
      return { ...updates, page: 1 }
    }
    return updates
  }, [])
  
  // Helper functions
  const goToPage = useCallback((page: number) => {
    updateFilters({ page })
  }, [updateFilters])
  
  const changeSort = useCallback((sortBy: string, sortOrder?: 'asc' | 'desc') => {
    const newSortOrder = sortOrder || (filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc')
    updateFilters({ sortBy, sortOrder: newSortOrder })
  }, [filters.sortBy, filters.sortOrder, updateFilters])
  
  const toggleFilter = useCallback((filterKey: keyof SearchFilters, value: any) => {
    const currentValue = filters[filterKey]
    let newValue: any

    // Which filters hold several values at once. Without this the first click
    // on an empty one fell through to the scalar branch below and stored a bare
    // string, so agesStages became "Women" rather than ["Women"] — and anything
    // that treated it as a list then broke on it.
    const isMultiValue =
      Array.isArray(currentValue) || MULTI_VALUE_FILTERS.includes(filterKey as string)

    if (isMultiValue) {
      const current = Array.isArray(currentValue) ? (currentValue as any[]) : []
      newValue = current.includes(value)
        ? current.filter((v: any) => v !== value)
        : [...current, value]
      // An empty list means "no filter", not "match nothing".
      if (newValue.length === 0) newValue = undefined
    } else if (typeof currentValue === 'boolean') {
      newValue = !currentValue
    } else {
      newValue = currentValue === value ? undefined : value
    }

    updateFilters(resetPage({ [filterKey]: newValue }))
  }, [filters, updateFilters, resetPage])
  
  // Computed values
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'page' || key === 'limit' || key === 'sortBy' || key === 'sortOrder') return false
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== null && value !== ''
    })
  }, [filters])
  
  // Counts each selection, not each field — picking three age groups reads as
  // three filters, which is what someone looking at the chips expects.
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).reduce((count, [key, value]) => {
      if (key === 'page' || key === 'limit' || key === 'sortBy' || key === 'sortOrder') return count
      if (Array.isArray(value)) return count + value.length
      return value !== undefined && value !== null && value !== '' ? count + 1 : count
    }, 0)
  }, [filters])
  
  // Auto-load facets on mount
  useEffect(() => {
    loadFacets()
  }, [loadFacets])
  
  // Initial search if filters are present
  useEffect(() => {
    const urlFilters = getFiltersFromUrl()
    if (Object.keys(urlFilters).length > 0) {
      search({}, { updateUrl: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount
  
  return {
    // State
    filters,
    results,
    facets,
    suggestions,
    loading,
    error,
    suggestionsLoading,
    
    // Actions
    search,
    updateFilters,
    clearFilters,
    getSuggestions,
    loadFacets,
    goToPage,
    changeSort,
    toggleFilter,
    
    // Computed
    hasActiveFilters,
    activeFilterCount,
    queryString: buildQueryString(),
    
    // Helpers
    buildQueryString,
    resetPage
  }
}