'use client'

import { useState } from 'react'
import { UserRole } from '@prisma/client'
import { BookOpen, Video, FileText, Download, ExternalLink, Users, MessageCircle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface LifeLineResourcesProps {
  userRole: UserRole
}

interface ResourceItem {
  id: string
  title: string
  description: string
  type: 'document' | 'video' | 'link' | 'guide'
  category: 'training' | 'materials' | 'support' | 'forms'
  url?: string
  downloadUrl?: string
  icon: any
}

const mockResources: ResourceItem[] = [
  {
    id: '1',
    title: 'LifeLine Leader Training Guide',
    description: 'Complete guide for new LifeLine leaders covering group management, facilitation techniques, and pastoral care.',
    type: 'document',
    category: 'training',
    downloadUrl: '/resources/leader-training-guide.pdf',
    icon: BookOpen
  },
  {
    id: '2',
    title: 'Leading Small Groups - Video Series',
    description: 'Comprehensive video training series on effective small group leadership and community building.',
    type: 'video',
    category: 'training',
    url: 'https://vimeo.com/example-training-series',
    icon: Video
  },
  {
    id: '3',
    title: 'Bible Study Discussion Guides',
    description: 'Ready-to-use discussion guides for various Bible study topics and seasonal studies.',
    type: 'document',
    category: 'materials',
    downloadUrl: '/resources/bible-study-guides.pdf',
    icon: FileText
  },
  {
    id: '4',
    title: 'Group Member Information Form',
    description: 'Template form for collecting member information, contact details, and prayer requests.',
    type: 'document',
    category: 'forms',
    downloadUrl: '/resources/member-info-form.pdf',
    icon: Users
  },
  {
    id: '5',
    title: 'Handling Difficult Conversations',
    description: 'Guidance for pastoral care situations and navigating challenging group dynamics.',
    type: 'guide',
    category: 'support',
    url: '/resources/difficult-conversations',
    icon: MessageCircle
  },
  {
    id: '6',
    title: 'LifeLine Event Planning Toolkit',
    description: 'Resources for planning group events, retreats, and special activities.',
    type: 'document',
    category: 'materials',
    downloadUrl: '/resources/event-planning-toolkit.pdf',
    icon: Calendar
  }
]

export function LifeLineResources({ userRole }: LifeLineResourcesProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const categories = [
    { key: 'all', label: 'All Resources', count: mockResources.length },
    { key: 'training', label: 'Training', count: mockResources.filter(r => r.category === 'training').length },
    { key: 'materials', label: 'Materials', count: mockResources.filter(r => r.category === 'materials').length },
    { key: 'support', label: 'Support', count: mockResources.filter(r => r.category === 'support').length },
    { key: 'forms', label: 'Forms', count: mockResources.filter(r => r.category === 'forms').length }
  ]

  const filteredResources = activeCategory === 'all' 
    ? mockResources 
    : mockResources.filter(resource => resource.category === activeCategory)

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'document':
        return FileText
      case 'video':
        return Video
      case 'link':
        return ExternalLink
      case 'guide':
        return BookOpen
      default:
        return FileText
    }
  }

  const getResourceAction = (resource: ResourceItem) => {
    if (resource.downloadUrl) {
      return (
        <a href={resource.downloadUrl} download>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </a>
      )
    }
    
    if (resource.url) {
      return (
        <a href={resource.url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            View
          </Button>
        </a>
      )
    }

    return null
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
      <div className="dashboard-card bg-gradient-to-r from-primary-50 to-secondary-50">
        <div className="flex items-start gap-4">
          <div className="bg-primary-100 p-3 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">New to Leading a LifeLine?</h3>
            <p className="text-gray-600 mb-4">
              Start with our comprehensive training guide and video series to build confidence in your leadership journey.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Training Guide
              </Button>
              <Button size="sm" variant="outline">
                <Video className="h-4 w-4 mr-2" />
                Watch Training Videos
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map(resource => {
          const IconComponent = resource.icon
          const ResourceIcon = getResourceIcon(resource.type)
          
          return (
            <div key={resource.id} className="dashboard-card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <IconComponent className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{resource.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <ResourceIcon className="h-3 w-3" />
                    <span className="capitalize">{resource.type}</span>
                    <span>•</span>
                    <span className="capitalize">{resource.category}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
              
              <div className="flex justify-end">
                {getResourceAction(resource)}
              </div>
            </div>
          )
        })}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
          <p className="text-gray-600">
            No resources found in the {activeCategory} category.
          </p>
        </div>
      )}

      {/* Support Section */}
      <div className="dashboard-card border-l-4 border-l-secondary-500">
        <div className="flex items-start gap-4">
          <div className="bg-secondary-100 p-3 rounded-lg">
            <MessageCircle className="h-6 w-6 text-secondary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Need Additional Support?</h3>
            <p className="text-gray-600 mb-4">
              Our Formation & Support team is here to help with any questions about leading your LifeLine.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="mailto:support@sainthelen.org">
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