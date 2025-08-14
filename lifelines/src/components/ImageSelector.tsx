'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { uploadFile } from '@/lib/upload-utils'

interface UnsplashImage {
  id: string
  alt_description: string
  urls: {
    thumb: string
    small: string
    regular: string
    full: string
  }
  width: number
  height: number
  color: string
  user: {
    name: string
    username: string
    profile_url: string
  }
  download_location: string
}

interface ImageSelectorProps {
  onSelect: (imageData: {
    url: string
    alt: string
    attribution?: string
  }) => void
  onClose: () => void
  currentImageUrl?: string
  currentImageAlt?: string
  currentImageAttribution?: string
}

export function ImageSelector({
  onSelect,
  onClose,
  currentImageUrl,
  currentImageAlt,
  currentImageAttribution
}: ImageSelectorProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'unsplash'>('upload')
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const result = await uploadFile(file)
      onSelect({
        url: result.fileUrl,
        alt: result.fileName || 'Uploaded image',
        attribution: undefined
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const searchUnsplash = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setError('')

    try {
      const response = await fetch('/api/unsplash/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          per_page: 12
        })
      })

      if (!response.ok) {
        throw new Error('Failed to search images')
      }

      const data = await response.json()
      setSearchResults(data.data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search images')
    } finally {
      setSearching(false)
    }
  }

  const selectUnsplashImage = async (image: UnsplashImage) => {
    try {
      // Track download with Unsplash (required by their API)
      await fetch('/api/unsplash/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          downloadLocation: image.download_location
        })
      })

      onSelect({
        url: image.urls.regular,
        alt: image.alt_description || 'Image from Unsplash',
        attribution: `Photo by <a href="${image.user.profile_url}" target="_blank" rel="noopener">${image.user.name}</a> on <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a>`
      })
    } catch (err) {
      // Even if tracking fails, still select the image
      onSelect({
        url: image.urls.regular,
        alt: image.alt_description || 'Image from Unsplash',
        attribution: `Photo by <a href="${image.user.profile_url}" target="_blank" rel="noopener">${image.user.name}</a> on <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a>`
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto m-4 w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Select Image</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="space-y-4">
      {/* Current Image Preview */}
      {currentImageUrl && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-2">Current Image</h4>
          <div className="flex items-start gap-4">
            <img
              src={currentImageUrl}
              alt={currentImageAlt || ''}
              className="w-32 h-20 object-cover rounded"
            />
            <div className="flex-1 text-sm text-gray-600">
              <p><strong>Alt text:</strong> {currentImageAlt || 'None'}</p>
              {currentImageAttribution && (
                <div>
                  <strong>Attribution:</strong>
                  <div dangerouslySetInnerHTML={{ __html: currentImageAttribution }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'upload'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('unsplash')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'unsplash'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Search Unsplash
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="image-upload">Choose Image File</Label>
            <Input
              id="image-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleFileUpload}
              disabled={uploading}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Supported formats: JPEG, PNG, WebP, GIF. Max size: 5MB
            </p>
          </div>
          {uploading && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600">Uploading...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unsplash Tab */}
      {activeTab === 'unsplash' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search for images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUnsplash()}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={searchUnsplash}
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {searchResults.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => selectUnsplashImage(image)}
                  className="group block relative rounded-lg overflow-hidden bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <img
                    src={image.urls.thumb}
                    alt={image.alt_description}
                    className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-colors" />
                  <div className="absolute bottom-1 right-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
                    {image.user.name}
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !searching && (
            <div className="text-center py-8 text-gray-500">
              No images found. Try a different search term.
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  )
}