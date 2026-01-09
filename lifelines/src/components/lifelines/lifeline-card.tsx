import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, Users, MapPin } from 'lucide-react'
import { LifeLineWithLeader } from '@/types'
import { formatGroupType, formatMeetingFrequency, formatDayOfWeek } from '@/utils/formatters'

interface LifeLineCardProps {
  lifeLine: LifeLineWithLeader
}

export function LifeLineCard({ lifeLine }: LifeLineCardProps) {
  const defaultImage = '/images/default-lifeline.jpg'

  return (
    <Link href={`/lifelines/${lifeLine.id}`} className="block group">
      <div className="relative h-64 bg-cover bg-center bg-no-repeat rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transform group-hover:-translate-y-2 transition-all duration-300 ease-out border border-gray-200 group-hover:border-gray-300"
           style={{
             backgroundImage: `linear-gradient(rgba(31, 52, 109, 0.4), rgba(31, 52, 109, 0.6)), url(${lifeLine.imageUrl || defaultImage})`
           }}>
        
        {/* Ages & Stages Badge */}
        {lifeLine.agesStages && lifeLine.agesStages.length > 0 && (
          <div className="absolute top-4 left-4">
            <span className="bg-secondary-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              {lifeLine.agesStages[0]}
            </span>
          </div>
        )}

        {/* Title */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <h3 className="text-white text-2xl font-bold text-center drop-shadow-lg leading-tight">
            {lifeLine.title}
          </h3>
        </div>

        {/* Leader Badge */}
        <div className="absolute bottom-4 left-4">
          <span className="bg-white/90 text-primary-700 px-3 py-1 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm">
            Leader: {lifeLine.groupLeader}
          </span>
        </div>

        {/* Status Badge */}
        {lifeLine.status !== 'PUBLISHED' && (
          <div className="absolute top-4 right-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-lg ${
              lifeLine.status === 'FULL'
                ? 'bg-red-500 text-white'
                : 'bg-yellow-500 text-white'
            }`}>
              {lifeLine.status === 'FULL' ? 'Full' : 'Draft'}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
    </Link>
  )
}