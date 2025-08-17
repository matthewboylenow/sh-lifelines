'use client'

import React from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function NotFoundSearchForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const query = formData.get('search') as string
    if (query) {
      window.location.href = `/lifelines?search=${encodeURIComponent(query)}`
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <Input
          type="text"
          name="search"
          placeholder="Search for LifeLines..."
          className="flex-1"
        />
        <Button type="submit">
          Search
        </Button>
      </div>
    </form>
  )
}