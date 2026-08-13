'use client'

import { useState, useEffect } from 'react'
import { UserRole, ResourceType } from '@prisma/client'
import { BookOpen, Video, FileText, Download, ExternalLink, MessageCircle,
  PlayCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { parseVideoUrl, isPlayableVideo } from '@/lib/video'

interface LifeLineResourcesProps {
  userRoles: UserRole[]
}

interface Resource {
  id: string
  title: string
  description: string | null
  websiteUrl: string | null
  videoUrl: string | null
  resourceType: ResourceType
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  isActive: boolean
}

const resourceTypeLabels: Record<ResourceType, string> = {
  BIBLE_STUDY_REFLECTIONS: 'Bible Study & Reflections',
  SERIES_PROGRAMS: 'Series & Programs',
  LEADER_FAITH_FORMATION: 'Leader Faith Formation'
}

const resourceTypeIcons: Record<ResourceType, any> = {
  BIBLE_STUDY_REFLECTIONS: BookOpen,
  SERIES_PROGRAMS: Video,
  LEADER_FAITH_FORMATION: FileText
}

export function LifeLineResources({ userRoles }: LifeLineResourcesProps) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<ResourceType | 'all'>('all')

  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/resources?limit=100')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch resources')
      }

      setResources(data.data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  const filteredResources = activeCategory === 'all'
    ? resources
    : resources.filter(resource => resource.resourceType === activeCategory)

  const categories = [
    { key: 'all' as const, label: 'All Resources', count: resources.length },
    ...Object.entries(resourceTypeLabels).map(([key, label]) => ({
      key: key as ResourceType,
      label,
      count: resources.filter(r => r.resourceType === key).length
    }))
  ]

  const ResourceVideo = ({ id, url, title }: { id: string; url: string; title: string }) => {
    const video = parseVideoUrl(url)
    const [signedUrl, setSignedUrl] = useState<string | null>(null)
    const [signError, setSignError] = useState(false)

    // Privately stored media needs a short-lived signed link, fetched on demand.
    useEffect(() => {
      if (video.kind !== 'private') return
      let cancelled = false
      fetch(`/api/resources/${id}/media`)
        .then(r => r.json())
        .then(d => { if (!cancelled) d?.data?.url ? setSignedUrl(d.data.url) : setSignError(true) })
        .catch(() => { if (!cancelled) setSignError(true) })
      return () => { cancelled = true }
    }, [id, video.kind])

    if (video.kind === 'private') {
      if (signError) {
        return (
          <p className="mb-4 text-sm text-red-600">
            This video could not be loaded. Please try again.
          </p>
        )
      }
      if (!signedUrl) {
        return (
          <div className="mb-4 flex items-center justify-center rounded-lg bg-gray-100 aspect-video">
            <LoadingSpinner className="w-6 h-6" />
          </div>
        )
      }
      return (
        <div className="mb-4 overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={signedUrl} controls preload="metadata" className="w-full aspect-video" />
        </div>
      )
    }

    if (video.kind === 'file' && video.fileUrl) {
      return (
        <div className="mb-4 overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={video.fileUrl} controls preload="metadata" className="w-full aspect-video" />
        </div>
      )
    }

    if (video.embedUrl) {
      return (
        <div className="mb-4 overflow-hidden rounded-lg bg-black">
          <iframe
            src={video.embedUrl}
            title={title}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )
    }

    return null
  }

  const getResourceAction = (resource: Resource) => {
    // A playable video renders inline below, so it needs no button here.
    if (resource.videoUrl && isPlayableVideo(resource.videoUrl)) {
      return null
    }

    if (resource.videoUrl) {
      return (
        <a href={resource.videoUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline">
            <PlayCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            Watch
          </Button>
        </a>
      )
    }

    if (resource.fileUrl) {
      return (
        <a href={resource.fileUrl} download={resource.fileName} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Download
          </Button>
        </a>
      )
    }

    if (resource.websiteUrl) {
      return (
        <a href={resource.websiteUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
            View
          </Button>
        </a>
      )
    }

    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2 text-gray-600">Loading resources...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchResources}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Button
            key={category.key}
            variant={activeCategory === category.key ? 'primary' : 'outline'}
            onClick={() => setActiveCategory(category.key)}
          >
            {category.label} ({category.count})
          </Button>
        ))}
      </div>

      {/* Quick Start Section */}
      {resources.length > 0 && (
        <div className="dashboard-card bg-gradient-to-r from-primary-50 to-secondary-50">
          <div className="flex items-start gap-4">
            <div className="bg-primary-100 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary-600" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">New to Leading a LifeLine?</h3>
              <p className="text-gray-600 mb-4">
                Explore our training materials and guides to build confidence in your leadership journey.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
          <p className="text-gray-600">
            {activeCategory === 'all'
              ? 'No resources have been added yet. Check back later!'
              : `No resources found in the ${resourceTypeLabels[activeCategory as ResourceType]} category.`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map(resource => {
            const Icon = resourceTypeIcons[resource.resourceType]

            return (
              <div key={resource.id} className="dashboard-card hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-4">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Icon className="h-5 w-5 text-gray-600" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{resource.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span>{resourceTypeLabels[resource.resourceType]}</span>
                      {resource.fileUrl && (
                        <>
                          <span>•</span>
                          <span className="flex items-center">
                            <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
                            {resource.fileName || 'Download'}
                          </span>
                        </>
                      )}
                      {resource.videoUrl && (
                        <>
                          <span>•</span>
                          <span className="flex items-center">
                            <PlayCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                            Video
                          </span>
                        </>
                      )}
                      {resource.websiteUrl && !resource.fileUrl && !resource.videoUrl && (
                        <>
                          <span>•</span>
                          <span className="flex items-center">
                            <ExternalLink className="h-3 w-3 mr-1" aria-hidden="true" />
                            External Link
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {resource.videoUrl && isPlayableVideo(resource.videoUrl) && (
                  <ResourceVideo id={resource.id} url={resource.videoUrl} title={resource.title} />
                )}

                {resource.description && (
                  <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
                )}

                <div className="flex justify-end">
                  {getResourceAction(resource)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Support Section */}
      <div className="dashboard-card border-l-4 border-l-secondary-500">
        <div className="flex items-start gap-4">
          <div className="bg-secondary-100 p-3 rounded-lg">
            <MessageCircle className="h-6 w-6 text-secondary-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Need Additional Support?</h3>
            <p className="text-gray-600 mb-4">
              Our Formation & Support team is here to help with any questions about leading your LifeLine.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="mailto:lifelines@sainthelen.org">
                <Button size="sm" variant="outline">
                  Contact Support Team
                </Button>
              </a>
              <a href="/dashboard/formation-support/support-tickets/create">
                <Button size="sm" variant="outline">
                  Submit Support Request
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
