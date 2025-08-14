import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { LifeLineStatus } from '@prisma/client'

// GET /api/lifelines/search-facets - Get search facets and counts for filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const includeHidden = searchParams.get('includeHidden') === 'true'
    
    // Base where clause
    const baseWhere = includeHidden ? {} : { isVisible: true, status: LifeLineStatus.PUBLISHED }

    // Get all the facet data in parallel
    const [
      groupTypeFacets,
      frequencyFacets,
      dayOfWeekFacets,
      agesStagesFacets,
      statusFacets,
      locationFacets,
      costFacets,
      participantsFacets,
      childcareFacets,
      leaderFacets
    ] = await Promise.all([
      // Group Type facets
      prisma.lifeLine.groupBy({
        by: ['groupType'],
        where: { ...baseWhere, groupType: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } }
      }),

      // Meeting Frequency facets
      prisma.lifeLine.groupBy({
        by: ['meetingFrequency'],
        where: { ...baseWhere, meetingFrequency: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } }
      }),

      // Day of Week facets
      prisma.lifeLine.groupBy({
        by: ['dayOfWeek'],
        where: { ...baseWhere, dayOfWeek: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } }
      }),

      // Get unique ages/stages values (this is more complex with array fields)
      prisma.$queryRaw<Array<{ agesStage: string, count: number }>>`
        SELECT unnest("agesStages") as "agesStage", COUNT(*) as count
        FROM "LifeLine" 
        WHERE ${includeHidden ? 'TRUE' : '"isVisible" = true AND "status" = \'PUBLISHED\''}
        AND "agesStages" IS NOT NULL 
        AND array_length("agesStages", 1) > 0
        GROUP BY unnest("agesStages")
        ORDER BY count DESC
      `,

      // Status facets
      prisma.lifeLine.groupBy({
        by: ['status'],
        where: includeHidden ? {} : { isVisible: true },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } }
      }),

      // Location facets (non-null locations)
      prisma.lifeLine.findMany({
        where: { ...baseWhere, location: { not: null } },
        select: { location: true },
        distinct: ['location'],
        take: 20,
        orderBy: { location: 'asc' }
      }),

      // Cost-related stats
      prisma.lifeLine.aggregate({
        where: baseWhere,
        _count: { cost: true },
        _min: { cost: true },
        _max: { cost: true },
        _avg: { cost: true }
      }),

      // Participants stats
      prisma.lifeLine.aggregate({
        where: baseWhere,
        _count: { maxParticipants: true },
        _min: { maxParticipants: true },
        _max: { maxParticipants: true },
        _avg: { maxParticipants: true }
      }),

      // Childcare facets
      prisma.lifeLine.groupBy({
        by: ['childcare'],
        where: baseWhere,
        _count: { _all: true }
      }),

      // Top leaders
      prisma.lifeLine.groupBy({
        by: ['groupLeader'],
        where: { ...baseWhere, groupLeader: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } },
        take: 10
      })
    ])

    // Calculate additional stats
    const [totalCount, freeCount, withLocationCount] = await Promise.all([
      prisma.lifeLine.count({ where: baseWhere }),
      prisma.lifeLine.count({ 
        where: { 
          ...baseWhere, 
          OR: [{ cost: null }, { cost: 0 }] 
        } 
      }),
      prisma.lifeLine.count({ 
        where: { ...baseWhere, location: { not: null } } 
      })
    ])

    // Format the response
    const facets = {
      groupTypes: groupTypeFacets.map(item => ({
        value: item.groupType,
        label: item.groupType?.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Other',
        count: item._count._all
      })),

      frequencies: frequencyFacets.map(item => ({
        value: item.meetingFrequency,
        label: item.meetingFrequency?.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Other',
        count: item._count._all
      })),

      daysOfWeek: dayOfWeekFacets.map(item => ({
        value: item.dayOfWeek,
        label: item.dayOfWeek?.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Other',
        count: item._count._all
      })),

      agesStages: agesStagesFacets.map(item => ({
        value: item.agesStage,
        label: item.agesStage,
        count: Number(item.count)
      })),

      statuses: includeHidden ? statusFacets.map(item => ({
        value: item.status,
        label: item.status.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        count: item._count._all
      })) : [],

      locations: locationFacets
        .filter(item => item.location)
        .map(item => ({
          value: item.location!,
          label: item.location!,
          count: 1 // We'd need a more complex query to get exact counts per location
        })),

      leaders: leaderFacets.map(item => ({
        value: item.groupLeader,
        label: item.groupLeader!,
        count: item._count._all
      })),

      childcare: childcareFacets.map(item => ({
        value: item.childcare,
        label: item.childcare ? 'With Childcare' : 'No Childcare',
        count: item._count._all
      })),

      // Summary statistics
      stats: {
        total: totalCount,
        free: freeCount,
        withLocation: withLocationCount,
        costRange: {
          min: costFacets._min.cost || 0,
          max: costFacets._max.cost || 0,
          average: costFacets._avg.cost || 0
        },
        participantsRange: {
          min: participantsFacets._min.maxParticipants || 0,
          max: participantsFacets._max.maxParticipants || 0,
          average: participantsFacets._avg.maxParticipants || 0
        }
      }
    }

    return createSuccessResponse(facets)
  } catch (error) {
    console.error('Error fetching search facets:', error)
    return createErrorResponse('Failed to fetch search facets', 500)
  }
}