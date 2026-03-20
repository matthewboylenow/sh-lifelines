'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useLifeLinesSearch } from '@/hooks/useLifeLinesSearch'

type SearchHookReturn = ReturnType<typeof useLifeLinesSearch>

const LifeLinesSearchContext = createContext<SearchHookReturn | null>(null)

export function useSharedSearch() {
  const ctx = useContext(LifeLinesSearchContext)
  if (!ctx) throw new Error('useSharedSearch must be used within LifeLinesSearchProvider')
  return ctx
}

export function LifeLinesSearchProvider({ children }: { children: ReactNode }) {
  const searchHook = useLifeLinesSearch({
    limit: 200,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  return (
    <LifeLinesSearchContext.Provider value={searchHook}>
      {children}
    </LifeLinesSearchContext.Provider>
  )
}
