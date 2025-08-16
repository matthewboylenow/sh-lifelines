'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Clock, TrendingUp } from 'lucide-react'
import { useLifeLinesSearch } from '@/hooks/useLifeLinesSearch'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface SearchBarProps {
  placeholder?: string
  showSuggestions?: boolean
  autoFocus?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onSearchSubmit?: (query: string) => void
}

export function SearchBar({
  placeholder = 'Search LifeLines...',
  showSuggestions = true,
  autoFocus = false,
  size = 'md',
  className = '',
  onSearchSubmit
}: SearchBarProps) {
  const {
    filters,
    suggestions,
    suggestionsLoading,
    updateFilters,
    getSuggestions
  } = useLifeLinesSearch()

  const [query, setQuery] = useState(filters.search || '')
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([])

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('lifelines-recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5)) // Limit to 5 recent searches
      } catch (e) {
        console.error('Failed to parse recent searches:', e)
      }
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return
    
    const newRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
    setRecentSearches(newRecent)
    localStorage.setItem('lifelines-recent-searches', JSON.stringify(newRecent))
  }, [recentSearches])

  // Debounced suggestion fetching
  useEffect(() => {
    if (!showSuggestions || !query.trim() || query.length < 2) {
      return
    }

    const timeoutId = setTimeout(() => {
      getSuggestions(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, getSuggestions, showSuggestions])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    setSelectedSuggestionIndex(-1)
    
    if (showSuggestions && newQuery.length >= 2) {
      setShowSuggestionsDropdown(true)
    } else {
      setShowSuggestionsDropdown(false)
    }
  }

  // Handle search submission
  const handleSubmit = (searchQuery?: string) => {
    const finalQuery = searchQuery || query
    if (!finalQuery.trim()) return

    saveRecentSearch(finalQuery)
    setShowSuggestionsDropdown(false)
    setSelectedSuggestionIndex(-1)
    
    updateFilters({ search: finalQuery, page: 1 })
    
    if (onSearchSubmit) {
      onSearchSubmit(finalQuery)
    }
  }

  // Handle form submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit()
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    handleSubmit(suggestion)
  }

  // Clear search
  const clearSearch = () => {
    setQuery('')
    setShowSuggestionsDropdown(false)
    setSelectedSuggestionIndex(-1)
    updateFilters({ search: undefined, page: 1 })
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestionsDropdown) return

    const allSuggestions = [
      ...recentSearches.map(s => ({ text: s, type: 'recent' })),
      ...suggestions
    ]

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(allSuggestions[selectedSuggestionIndex].text)
        } else {
          handleSubmit()
        }
        break
      case 'Escape':
        setShowSuggestionsDropdown(false)
        setSelectedSuggestionIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestionsDropdown(false)
        setSelectedSuggestionIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Size classes
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-12 px-4 text-base',
    lg: 'h-14 px-6 text-lg'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const allSuggestions = showSuggestions ? [
    ...recentSearches.map(s => ({ text: s, type: 'recent' as const, category: 'Recent Searches' })),
    ...suggestions
  ] : []

  return (
    <div className={`relative w-full ${className}`}>
      <form onSubmit={handleFormSubmit} className="relative">
        {/* Search Input */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${iconSizes[size]}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => showSuggestions && setShowSuggestionsDropdown(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`
              w-full ${sizeClasses[size]} pl-10 pr-12 
              border border-gray-300 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              bg-white shadow-sm transition-all duration-200
            `}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 ${iconSizes[size]}`}
            >
              <X />
            </button>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && showSuggestionsDropdown && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {suggestionsLoading ? (
            <div className="p-4 text-center">
              <LoadingSpinner className="mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading suggestions...</p>
            </div>
          ) : allSuggestions.length > 0 ? (
            <div className="py-2">
              {allSuggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.type}-${index}`}
                  ref={el => { suggestionRefs.current[index] = el }}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className={`
                    px-4 py-2 cursor-pointer flex items-center space-x-3
                    ${index === selectedSuggestionIndex 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-gray-50 text-gray-700'
                    }
                  `}
                >
                  <div className="flex-shrink-0">
                    {suggestion.type === 'recent' ? (
                      <Clock className="h-4 w-4 text-gray-400" />
                    ) : suggestion.type === 'popular' ? (
                      <TrendingUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Search className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {suggestion.text}
                    </div>
                    {suggestion.category && suggestion.type !== 'recent' && (
                      <div className="text-xs text-gray-500 truncate">
                        {suggestion.category}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No suggestions found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}