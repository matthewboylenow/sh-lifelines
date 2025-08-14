import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { LifeLineStatus } from '@prisma/client'

// GET /api/lifelines/search-suggestions - Get search suggestions based on query
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)
    const includeHidden = searchParams.get('includeHidden') === 'true'
    
    if (!query || query.length < 2) {
      return createSuccessResponse({ suggestions: [] })
    }

    // Base where clause for visibility
    const baseWhere = includeHidden ? {} : { isVisible: true, status: LifeLineStatus.PUBLISHED }

    // Get suggestions from different fields
    const [
      titleSuggestions,
      leaderSuggestions,
      locationSuggestions,
      agesStagesSuggestions
    ] = await Promise.all([
      // Title suggestions
      prisma.lifeLine.findMany({
        where: {
          ...baseWhere,
          title: { contains: query, mode: 'insensitive' }
        },
        select: { 
          title: true,
          id: true,
          groupType: true 
        },
        take: limit,
        orderBy: { title: 'asc' }
      }),

      // Leader suggestions
      prisma.lifeLine.findMany({
        where: {
          ...baseWhere,
          OR: [
            { groupLeader: { contains: query, mode: 'insensitive' } },
            { leader: { displayName: { contains: query, mode: 'insensitive' } } }
          ]
        },
        select: { 
          groupLeader: true,
          leader: { select: { displayName: true } },
          id: true,
          title: true 
        },
        take: limit,
        orderBy: { groupLeader: 'asc' }
      }),

      // Location suggestions
      prisma.lifeLine.findMany({
        where: {
          ...baseWhere,
          location: { 
            contains: query, 
            mode: 'insensitive',
            not: null 
          }
        },
        select: { 
          location: true,
          id: true,
          title: true 
        },
        take: limit,
        distinct: ['location'],
        orderBy: { location: 'asc' }
      }),

      // Ages/Stages suggestions (more complex with arrays)
      prisma.$queryRaw<Array<{ agesStage: string, title: string, id: string }>>`
        SELECT DISTINCT unnest("agesStages") as "agesStage", "title", "id"
        FROM "LifeLine"
        WHERE ${includeHidden ? 'TRUE' : '"isVisible" = true AND "status" = \'PUBLISHED\''}
        AND EXISTS (
          SELECT 1 FROM unnest("agesStages") as stage
          WHERE stage ILIKE ${'%' + query + '%'}
        )
        LIMIT ${limit}
      `
    ])

    // Format suggestions by category
    const suggestions = {
      titles: titleSuggestions.map(item => ({
        id: item.id,
        text: item.title,
        type: 'title',
        category: 'LifeLine Titles',
        metadata: { groupType: item.groupType }
      })),

      leaders: leaderSuggestions
        .map(item => {
          const leaderName = item.leader?.displayName || item.groupLeader
          return leaderName ? {
            id: item.id,
            text: leaderName,
            type: 'leader',
            category: 'Leaders',
            metadata: { title: item.title }
          } : null
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),

      locations: locationSuggestions
        .map(item => item.location ? ({
          id: item.id,
          text: item.location,
          type: 'location',
          category: 'Locations',
          metadata: { title: item.title }
        }) : null)
        .filter((item): item is NonNullable<typeof item> => item !== null),

      agesStages: agesStagesSuggestions
        .filter(item => item.agesStage.toLowerCase().includes(query.toLowerCase()))
        .map(item => ({
          id: item.id,
          text: item.agesStage,
          type: 'agesStage',
          category: 'Ages & Stages',
          metadata: { title: item.title }
        }))
    }

    // Combine all suggestions and remove duplicates
    const allSuggestions = [
      ...suggestions.titles,
      ...suggestions.leaders,
      ...suggestions.locations,
      ...suggestions.agesStages
    ]

    // Remove duplicates based on text and type
    const uniqueSuggestions = allSuggestions
      .filter((suggestion, index, array) => 
        array.findIndex(s => s.text === suggestion.text && s.type === suggestion.type) === index
      )
      .slice(0, limit)

    // Add popular searches if no results
    let popularSuggestions: any[] = []
    if (uniqueSuggestions.length === 0) {
      // Get popular search terms (this could be enhanced with actual search analytics)
      popularSuggestions = [
        { text: 'Bible Study', type: 'popular', category: 'Popular Searches' },
        { text: 'Prayer Group', type: 'popular', category: 'Popular Searches' },
        { text: 'Women', type: 'popular', category: 'Popular Searches' },
        { text: 'Men', type: 'popular', category: 'Popular Searches' },
        { text: 'Seniors', type: 'popular', category: 'Popular Searches' }
      ].filter(item => item.text.toLowerCase().includes(query.toLowerCase()))
    }

    return createSuccessResponse({
      query,
      suggestions: uniqueSuggestions,
      popular: popularSuggestions,
      categorized: suggestions,
      total: uniqueSuggestions.length
    })
    
  } catch (error) {
    console.error('Error fetching search suggestions:', error)
    return createErrorResponse('Failed to fetch search suggestions', 500)
  }
}