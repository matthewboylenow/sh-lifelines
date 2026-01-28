import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
  parsePaginationParams,
  createPaginatedResponse
} from '@/lib/api-utils'
import { createLifeLineSchema } from '@/lib/validations'
import { LifeLineStatus, GroupType, MeetingFrequency, DayOfWeek } from '@prisma/client'
import { ZodError } from 'zod'

// GET /api/lifelines - List LifeLines with advanced filtering and search
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePaginationParams(searchParams)
    
    // Parse advanced filters
    const filters = {
      // Basic filters
      status: searchParams.get('status') as LifeLineStatus | undefined,
      groupType: searchParams.get('groupType') as GroupType | undefined,
      meetingFrequency: searchParams.get('meetingFrequency') as MeetingFrequency | undefined,
      dayOfWeek: searchParams.get('dayOfWeek') as DayOfWeek | undefined,
      leaderId: searchParams.get('leaderId'),
      
      // Array filters
      agesStages: searchParams.get('agesStages')?.split(',').filter(Boolean),
      groupTypes: searchParams.get('groupTypes')?.split(',').filter(Boolean) as GroupType[],
      frequencies: searchParams.get('frequencies')?.split(',').filter(Boolean) as MeetingFrequency[],
      
      // Search and text filters
      search: searchParams.get('search'),
      title: searchParams.get('title'),
      description: searchParams.get('description'),
      leader: searchParams.get('leader'),
      
      // Meeting details
      location: searchParams.get('location'),
      hasLocation: searchParams.get('hasLocation') === 'true',
      hasChildcare: searchParams.get('hasChildcare') === 'true',
      
      // Cost filters
      isFree: searchParams.get('isFree') === 'true',
      maxCost: searchParams.get('maxCost') ? parseFloat(searchParams.get('maxCost')!) : undefined,
      
      // Capacity filters
      hasSpace: searchParams.get('hasSpace') === 'true',
      maxParticipants: searchParams.get('maxParticipants') ? parseInt(searchParams.get('maxParticipants')!) : undefined,
      
      // Visibility
      isVisible: searchParams.get('isVisible') !== 'false', // Default to true unless explicitly false
      
      // Sorting
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc',
      
      // Advanced search options
      exactMatch: searchParams.get('exactMatch') === 'true',
      searchFields: searchParams.get('searchFields')?.split(',').filter(Boolean) || ['title', 'description', 'groupLeader'],
    }

    // Build where clause with advanced filtering
    const where: any = {
      // Always filter by visibility unless explicitly requested
      isVisible: filters.isVisible
    }

    // Status filtering
    if (filters.status) {
      where.status = filters.status
    }

    // Group type filtering - support both single and multiple
    if (filters.groupType) {
      where.groupType = filters.groupType
    } else if (filters.groupTypes && filters.groupTypes.length > 0) {
      where.groupType = { in: filters.groupTypes }
    }

    // Meeting frequency filtering - support both single and multiple  
    if (filters.meetingFrequency) {
      where.meetingFrequency = filters.meetingFrequency
    } else if (filters.frequencies && filters.frequencies.length > 0) {
      where.meetingFrequency = { in: filters.frequencies }
    }

    // Day of week filtering
    if (filters.dayOfWeek) {
      where.dayOfWeek = filters.dayOfWeek
    }

    // Leader filtering
    if (filters.leaderId) {
      where.leaderId = filters.leaderId
    }

    // Ages & stages filtering
    if (filters.agesStages && filters.agesStages.length > 0) {
      where.agesStages = {
        hasSome: filters.agesStages
      }
    }

    // Location filtering
    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' }
    }
    if (filters.hasLocation) {
      where.location = { not: null }
    }

    // Childcare filtering
    if (filters.hasChildcare) {
      where.childcare = true
    }

    // Cost filtering
    if (filters.isFree) {
      where.OR = [
        { cost: null },
        { cost: 0 }
      ]
    } else if (filters.maxCost !== undefined) {
      where.cost = { lte: filters.maxCost }
    }

    // Capacity filtering
    if (filters.maxParticipants !== undefined) {
      where.maxParticipants = { lte: filters.maxParticipants }
    }
    if (filters.hasSpace) {
      where.maxParticipants = { not: null }
    }

    // Advanced search logic
    const searchConditions: any[] = []
    
    if (filters.search) {
      const searchTerm = filters.exactMatch ? filters.search : filters.search
      const mode = filters.exactMatch ? 'exact' : 'insensitive'
      
      if (filters.searchFields.includes('title')) {
        searchConditions.push({ title: { contains: searchTerm, mode } })
      }
      if (filters.searchFields.includes('description')) {
        searchConditions.push({ description: { contains: searchTerm, mode } })
      }
      if (filters.searchFields.includes('groupLeader')) {
        searchConditions.push({ groupLeader: { contains: searchTerm, mode } })
      }
      if (filters.searchFields.includes('leader')) {
        searchConditions.push({ 
          leader: { 
            displayName: { contains: searchTerm, mode } 
          } 
        })
      }
      if (filters.searchFields.includes('location')) {
        searchConditions.push({ location: { contains: searchTerm, mode } })
      }
      if (filters.searchFields.includes('agesStages')) {
        searchConditions.push({ agesStages: { hasSome: [searchTerm] } })
      }
    }

    // Individual field searches
    if (filters.title) {
      searchConditions.push({ title: { contains: filters.title, mode: 'insensitive' } })
    }
    if (filters.description) {
      searchConditions.push({ description: { contains: filters.description, mode: 'insensitive' } })
    }
    if (filters.leader) {
      searchConditions.push({ 
        OR: [
          { groupLeader: { contains: filters.leader, mode: 'insensitive' } },
          { leader: { displayName: { contains: filters.leader, mode: 'insensitive' } } }
        ]
      })
    }

    if (searchConditions.length > 0) {
      where.OR = searchConditions
    }

    // Build dynamic sort options
    const buildOrderBy = () => {
      const orderBy: any[] = []
      
      switch (filters.sortBy) {
        case 'title':
          orderBy.push({ title: filters.sortOrder })
          break
        case 'groupLeader':
          orderBy.push({ groupLeader: filters.sortOrder })
          break
        case 'status':
          orderBy.push({ status: filters.sortOrder })
          break
        case 'groupType':
          orderBy.push({ groupType: filters.sortOrder })
          break
        case 'meetingFrequency':
          orderBy.push({ meetingFrequency: filters.sortOrder })
          break
        case 'dayOfWeek':
          orderBy.push({ dayOfWeek: filters.sortOrder })
          break
        case 'cost':
          orderBy.push({ cost: { sort: filters.sortOrder, nulls: 'last' } })
          break
        case 'maxParticipants':
          orderBy.push({ maxParticipants: { sort: filters.sortOrder, nulls: 'last' } })
          break
        case 'inquiries':
          // This requires a special case since we're counting related records
          orderBy.push({ inquiries: { _count: filters.sortOrder } })
          break
        case 'random':
          // PostgreSQL-specific random ordering
          // This will be handled differently if needed
          orderBy.push({ createdAt: 'desc' })
          break
        default:
          orderBy.push({ [filters.sortBy]: filters.sortOrder })
      }
      
      // Always add a secondary sort for consistent pagination
      if (filters.sortBy !== 'createdAt') {
        orderBy.push({ createdAt: 'desc' })
      }
      
      return orderBy
    }

    const [lifeLines, total] = await Promise.all([
      prisma.lifeLine.findMany({
        where,
        include: {
          leader: {
            select: {
              id: true,
              displayName: true,
              email: true,
            }
          },
          supportContact: {
            select: {
              id: true,
              displayName: true,
              email: true,
              cellPhone: true,
            }
          },
          _count: {
            select: {
              inquiries: true
            }
          }
        },
        orderBy: buildOrderBy(),
        skip,
        take: limit,
      }),
      prisma.lifeLine.count({ where })
    ])

    // Add search metadata and analytics
    const searchMetadata = {
      appliedFilters: Object.keys(filters).reduce((acc, key) => {
        const value = (filters as any)[key]
        if (value !== undefined && value !== null && value !== '' && 
            !(Array.isArray(value) && value.length === 0)) {
          acc[key] = value
        }
        return acc
      }, {} as any),
      
      totalFiltersApplied: Object.keys(filters).filter(key => {
        const value = (filters as any)[key]
        return value !== undefined && value !== null && value !== '' && 
               !(Array.isArray(value) && value.length === 0) &&
               key !== 'sortBy' && key !== 'sortOrder' && key !== 'searchFields' &&
               key !== 'exactMatch' && key !== 'isVisible'
      }).length,
      
      hasSearch: !!filters.search,
      hasFilters: Object.keys(filters).some(key => {
        const value = (filters as any)[key]
        return value !== undefined && value !== null && value !== '' && 
               !(Array.isArray(value) && value.length === 0) &&
               key !== 'sortBy' && key !== 'sortOrder' && key !== 'searchFields' &&
               key !== 'exactMatch' && key !== 'isVisible'
      }),
      
      sortedBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    }

    const response = createPaginatedResponse(lifeLines, total, page, limit)
    const responseWithMetadata = {
      ...response,
      metadata: searchMetadata
    }

    return createSuccessResponse(responseWithMetadata)
  } catch (error) {
    console.error('Error fetching LifeLines:', error)
    return createErrorResponse('Failed to fetch LifeLines', 500)
  }
}

// POST /api/lifelines - Create new LifeLine
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate the incoming data
    const validatedData = createLifeLineSchema.parse(body)

    // Create the LifeLine with the validated data
    const lifeLine = await prisma.lifeLine.create({
      data: {
        title: validatedData.title,
        subtitle: validatedData.subtitle || null,
        description: validatedData.description || null,
        groupLeader: validatedData.groupLeader || null,
        leaderEmail: validatedData.leaderEmail || null,
        leaderId: validatedData.leaderId || null,
        supportContactId: validatedData.supportContactId || null,
        dayOfWeek: validatedData.dayOfWeek || null,
        meetingTime: validatedData.meetingTime || null,
        location: validatedData.location || null,
        meetingFrequency: validatedData.meetingFrequency || null,
        groupType: validatedData.groupType || null,
        agesStages: validatedData.agesStages || [],
        maxParticipants: validatedData.maxParticipants || null,
        duration: validatedData.duration || null,
        cost: validatedData.cost || null,
        childcare: validatedData.childcare || false,
        imageUrl: validatedData.imageUrl || null,
        imageAlt: validatedData.imageAlt || null,
        imageAttribution: validatedData.imageAttribution || null,
        status: validatedData.status || 'DRAFT',
        isVisible: validatedData.isVisible ?? true,
      },
      include: {
        leader: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        },
        supportContact: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        },
        _count: {
          select: {
            inquiries: true
          }
        }
      }
    })

    return createSuccessResponse(lifeLine, 'LifeLine created successfully')
  } catch (error) {
    console.error('Error creating LifeLine:', error)

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorMessages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return createErrorResponse(`Validation error: ${errorMessages}`, 400)
    }

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; message?: string }
      if (prismaError.code === 'P2002') {
        return createErrorResponse('A LifeLine with this information already exists', 409)
      }
      if (prismaError.code === 'P2003') {
        return createErrorResponse('Invalid reference: leader or support contact not found', 400)
      }
    }

    return createErrorResponse('Failed to create LifeLine', 500)
  }
}