'use client'

import { useState, useEffect } from 'react'
import { LifeLineCard } from './lifeline-card'
import { LifeLineWithLeader } from '@/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function LifeLinesGrid() {
  const [lifeLines, setLifeLines] = useState<LifeLineWithLeader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLifeLines()
  }, [])

  const fetchLifeLines = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/lifelines')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch LifeLines')
      }

      setLifeLines(data.data.items || [])
    } catch (error) {
      console.error('Error fetching LifeLines:', error)
      setError(error instanceof Error ? error.message : 'Failed to load LifeLines')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner className="w-8 h-8" />
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
        <button
          onClick={fetchLifeLines}
          className="dashboard-button"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Sample data for display when no real data is available
  const sampleLifeLines: LifeLineWithLeader[] = [
    {
      id: 'sample-1',
      title: 'Rosary LifeLine',
      description: 'Join us for weekly rosary prayer and reflection',
      imageUrl: '/images/Lifelines exmp 1.jpg',
      imageAlt: null,
      imageAttribution: null,
      videoUrl: null,
      agesStages: ['All Ages & Stages'],
      groupLeader: 'Gail Opacitty',
      leaderEmail: 'gail@example.com',
      status: 'PUBLISHED',
      groupType: 'ACTIVITY',
      meetingFrequency: 'WEEKLY',
      dayOfWeek: 'SUNDAY',
      meetingTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      leaderId: 'leader-1',
      formationRequestId: null,
      leader: {
        id: 'leader-1',
        email: 'gail@example.com',
        displayName: 'Gail Opacitty',
        username: null,
        password: 'placeholder',
        isActive: true,
        resetToken: null,
        resetTokenExpiry: null,
        role: 'LIFELINE_LEADER',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      id: 'sample-2',
      title: 'Set the World on Fire – Uncover Your Charism',
      description: 'Discover your spiritual gifts and charisms',
      imageUrl: '/images/Lifelines exmp 1.jpg',
      imageAlt: null,
      imageAttribution: null,
      videoUrl: null,
      agesStages: ['All Ages & Stages'],
      groupLeader: 'Alda Galuszki',
      leaderEmail: 'alda@example.com',
      status: 'PUBLISHED',
      groupType: 'SCRIPTURE_BASED',
      meetingFrequency: 'WEEKLY',
      dayOfWeek: 'MONDAY',
      meetingTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      leaderId: 'leader-2',
      formationRequestId: null,
      leader: {
        id: 'leader-2',
        email: 'alda@example.com',
        displayName: 'Alda Galuszki',
        username: null,
        password: 'placeholder',
        isActive: true,
        resetToken: null,
        resetTokenExpiry: null,
        role: 'LIFELINE_LEADER',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      id: 'sample-3',
      title: 'Here I am God... Separated/Divorced and Believer',
      description: 'Support group for separated and divorced Catholics',
      imageUrl: '/images/Lifelines exmp 1.jpg',
      imageAlt: null,
      imageAttribution: null,
      videoUrl: null,
      agesStages: ['All Ages & Stages'],
      groupLeader: 'Barbara Sullivan',
      leaderEmail: 'barbara@example.com',
      status: 'PUBLISHED',
      groupType: 'SOCIAL',
      meetingFrequency: 'MONTHLY',
      dayOfWeek: 'TUESDAY',
      meetingTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      leaderId: 'leader-3',
      formationRequestId: null,
      leader: {
        id: 'leader-3',
        email: 'barbara@example.com',
        displayName: 'Barbara Sullivan',
        username: null,
        password: 'placeholder',
        isActive: true,
        resetToken: null,
        resetTokenExpiry: null,
        role: 'LIFELINE_LEADER',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      id: 'sample-4',
      title: 'Saint Helen Voices',
      description: 'Parish choir and music ministry',
      imageUrl: '/images/Lifelines exmp 1.jpg',
      imageAlt: null,
      imageAttribution: null,
      videoUrl: null,
      agesStages: ['Men, Women'],
      groupLeader: 'Cindy Brogan',
      leaderEmail: 'cindy@example.com',
      status: 'PUBLISHED',
      groupType: 'ACTIVITY',
      meetingFrequency: 'WEEKLY',
      dayOfWeek: 'THURSDAY',
      meetingTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      leaderId: 'leader-4',
      formationRequestId: null,
      leader: {
        id: 'leader-4',
        email: 'cindy@example.com',
        displayName: 'Cindy Brogan',
        username: null,
        password: 'placeholder',
        isActive: true,
        resetToken: null,
        resetTokenExpiry: null,
        role: 'LIFELINE_LEADER',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      id: 'sample-5',
      title: 'Faith Sharing Wednesday Evenings',
      description: 'Weekly faith sharing and discussion',
      imageUrl: '/images/Lifelines exmp 1.jpg',
      imageAlt: null,
      imageAttribution: null,
      videoUrl: null,
      agesStages: ['All Ages & Stages'],
      groupLeader: 'EileenPassarelli',
      leaderEmail: 'eileen@example.com',
      status: 'PUBLISHED',
      groupType: 'SCRIPTURE_BASED',
      meetingFrequency: 'WEEKLY',
      dayOfWeek: 'WEDNESDAY',
      meetingTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      leaderId: 'leader-5',
      formationRequestId: null,
      leader: {
        id: 'leader-5',
        email: 'eileen@example.com',
        displayName: 'EileenPassarelli',
        username: null,
        password: 'placeholder',
        isActive: true,
        resetToken: null,
        resetTokenExpiry: null,
        role: 'LIFELINE_LEADER',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      id: 'sample-6',
      title: 'Bible Lens',
      description: 'In-depth Bible study and reflection',
      imageUrl: '/images/Lifelines exmp 1.jpg',
      imageAlt: null,
      imageAttribution: null,
      videoUrl: null,
      agesStages: ['Men, Women, All Ages & Stages'],
      groupLeader: 'Paul Maleck',
      leaderEmail: 'paul@example.com',
      status: 'PUBLISHED',
      groupType: 'SCRIPTURE_BASED',
      meetingFrequency: 'WEEKLY',
      dayOfWeek: 'FRIDAY',
      meetingTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      leaderId: 'leader-6',
      formationRequestId: null,
      leader: {
        id: 'leader-6',
        email: 'paul@example.com',
        displayName: 'Paul Maleck',
        username: null,
        password: 'placeholder',
        isActive: true,
        resetToken: null,
        resetTokenExpiry: null,
        role: 'LIFELINE_LEADER',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  ]

  const displayLifeLines = lifeLines.length > 0 ? lifeLines : sampleLifeLines

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Available LifeLines
        </h2>
        <p className="text-gray-600">
          Found {displayLifeLines.length} group{displayLifeLines.length !== 1 ? 's' : ''} for you to explore
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayLifeLines.map((lifeLine) => (
          <LifeLineCard key={lifeLine.id} lifeLine={lifeLine} />
        ))}
      </div>
    </div>
  )
}