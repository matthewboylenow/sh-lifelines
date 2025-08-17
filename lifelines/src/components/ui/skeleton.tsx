import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  animate?: boolean
}

export function Skeleton({ 
  className = '', 
  width, 
  height, 
  rounded = true,
  animate = true 
}: SkeletonProps) {
  const roundedClasses = {
    true: 'rounded-md',
    false: '',
    sm: 'rounded-sm',
    md: 'rounded-md', 
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  }
  const roundedClass = roundedClasses[rounded as keyof typeof roundedClasses] || 'rounded-md'

  const style: React.CSSProperties = {}
  if (width) style.width = width
  if (height) style.height = height

  return (
    <div
      className={`
        bg-gray-200 
        ${roundedClass} 
        ${animate ? 'animate-pulse' : ''} 
        ${className}
      `.trim()}
      style={style}
    />
  )
}

// Pre-built skeleton components for common layouts

export function CardSkeleton() {
  return (
    <div className="dashboard-card">
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton width={60} height={60} rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton height={20} width="60%" />
            <Skeleton height={16} width="40%" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton height={16} width="100%" />
          <Skeleton height={16} width="80%" />
          <Skeleton height={16} width="90%" />
        </div>
        <div className="flex space-x-2 pt-4">
          <Skeleton height={32} width={80} rounded="md" />
          <Skeleton height={32} width={60} rounded="md" />
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="dashboard-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <Skeleton height={16} width="80%" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <Skeleton height={16} width={colIndex === 0 ? "100%" : "60%"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function LifeLineCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <Skeleton height={200} rounded={false} />
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Skeleton height={24} width="80%" className="mb-2" />
            <Skeleton height={16} width="40%" />
          </div>
          <Skeleton height={24} width={60} rounded="full" />
        </div>
        
        <div className="space-y-2 mb-4">
          <Skeleton height={16} width="100%" />
          <Skeleton height={16} width="90%" />
          <Skeleton height={16} width="70%" />
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Skeleton width={16} height={16} className="mr-2" />
              <Skeleton width={80} height={16} />
            </div>
            <div className="flex items-center">
              <Skeleton width={16} height={16} className="mr-2" />
              <Skeleton width={60} height={16} />
            </div>
          </div>
          <Skeleton height={32} width={100} rounded="md" />
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton height={36} width="40%" />
        <Skeleton height={20} width="60%" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-card">
            <div className="flex items-center">
              <Skeleton width={48} height={48} rounded="lg" className="mr-4" />
              <div className="flex-1">
                <Skeleton height={24} width="60%" className="mb-1" />
                <Skeleton height={16} width="80%" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CardSkeleton />
        </div>
        <div>
          <CardSkeleton />
        </div>
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton height={16} width="25%" />
          <Skeleton height={40} width="100%" rounded="md" />
        </div>
      ))}
      
      <div className="flex space-x-4 pt-6">
        <Skeleton height={40} width={100} rounded="md" />
        <Skeleton height={40} width={80} rounded="md" />
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Profile Info */}
      <div className="lg:col-span-1">
        <div className="dashboard-card text-center">
          <Skeleton width={80} height={80} rounded="full" className="mx-auto mb-4" />
          <Skeleton height={24} width="60%" className="mx-auto mb-2" />
          <Skeleton height={16} width="80%" className="mx-auto mb-4" />
          <Skeleton height={24} width={100} rounded="full" className="mx-auto" />
        </div>
      </div>

      {/* Profile Form */}
      <div className="lg:col-span-2">
        <div className="dashboard-card">
          <Skeleton height={24} width="40%" className="mb-6" />
          <FormSkeleton />
        </div>
      </div>
    </div>
  )
}