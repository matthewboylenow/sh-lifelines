import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  parsePaginationParams,
  createPaginatedResponse 
} from '@/lib/api-utils'
import { createInquirySchema } from '@/lib/validations'
import { InquiryStatus } from '@prisma/client'
import { sendInquiryNotification } from '@/lib/email'

// GET /api/inquiries - List inquiries with filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePaginationParams(searchParams)
    
    // Parse filters
    const filters = {
      status: searchParams.get('status') as InquiryStatus | undefined,
      lifeLineId: searchParams.get('lifeLineId'),
      leaderId: searchParams.get('leaderId'),
      search: searchParams.get('search'),
      recent: searchParams.get('recent') === 'true',
    }

    // Build where clause
    const where: any = {}

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.lifeLineId) {
      where.lifeLineId = filters.lifeLineId
    }

    if (filters.leaderId) {
      where.lifeLine = {
        leaderId: filters.leaderId
      }
    }

    if (filters.search) {
      where.OR = [
        { personName: { contains: filters.search, mode: 'insensitive' } },
        { personEmail: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } },
        { lifeLine: { title: { contains: filters.search, mode: 'insensitive' } } },
      ]
    }

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: {
          lifeLine: {
            include: {
              leader: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: filters.recent ? 0 : skip,
        take: filters.recent ? 10 : limit,
      }),
      prisma.inquiry.count({ where })
    ])

    return createSuccessResponse(
      filters.recent 
        ? { items: inquiries, total }
        : createPaginatedResponse(inquiries, total, page, limit)
    )
  } catch (error) {
    console.error('Error fetching inquiries:', error)
    return createErrorResponse('Failed to fetch inquiries', 500)
  }
}

// POST /api/inquiries - Create new inquiry (public endpoint)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = createInquirySchema.parse(body)

    // Get the LifeLine and leader info
    const lifeLine = await prisma.lifeLine.findUnique({
      where: { id: validatedData.lifeLineId },
      include: {
        leader: true
      }
    })

    if (!lifeLine) {
      return createErrorResponse('LifeLine not found', 404)
    }

    if (lifeLine.status !== 'PUBLISHED') {
      return createErrorResponse('This LifeLine is not accepting inquiries', 400)
    }

    // Create the inquiry with source tracking
    const inquiry = await prisma.inquiry.create({
      data: {
        personName: validatedData.personName,
        personEmail: validatedData.personEmail,
        personPhone: validatedData.personPhone,
        message: validatedData.message,
        lifeLineId: validatedData.lifeLineId,
        source: validatedData.source || 'PUBLIC_WEBSITE',
      },
      include: {
        lifeLine: {
          include: {
            leader: {
              select: {
                id: true,
                displayName: true,
                email: true,
              }
            }
          }
        }
      }
    })

    // Send notification to the LifeLine leader
    if (lifeLine.leader) {
      try {
        await sendInquiryNotification(
          lifeLine.leader.email,
          lifeLine.leader.displayName || lifeLine.groupLeader || 'LifeLine Leader',
          lifeLine.title,
          {
            personName: inquiry.personName,
            personEmail: inquiry.personEmail || undefined,
            message: inquiry.message || undefined,
          }
        )
      } catch (emailError) {
        console.error('Failed to send inquiry notification:', emailError)
        // Don't fail the inquiry creation if email fails
      }
    }

    return createSuccessResponse(inquiry, 'Inquiry submitted successfully')
  } catch (error) {
    console.error('Error creating inquiry:', error)
    return createErrorResponse('Failed to create inquiry', 500)
  }
}