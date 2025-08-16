import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'

// Validation schema for imported LifeLine data
const ImportLifeLineSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  subtitle: z.string().optional(),
  groupLeader: z.string().min(1, 'Group leader is required'),
  dayOfWeek: z.string().optional(),
  meetingTime: z.string().optional(),
  location: z.string().optional(),
  meetingFrequency: z.string().optional(),
  groupType: z.string().optional(),
  agesStages: z.array(z.string()).optional(),
  maxParticipants: z.number().optional(),
  duration: z.string().optional(),
  cost: z.number().optional(),
  childcare: z.boolean().optional(),
  imageUrl: z.string().optional(),
  status: z.string().optional(),
})

const ImportRequestSchema = z.object({
  data: z.array(ImportLifeLineSchema),
  clearExisting: z.boolean().default(false)
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { data: importData, clearExisting } = ImportRequestSchema.parse(body)

    const results = {
      imported: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{
        identifier: string
        status: 'imported' | 'skipped' | 'error'
        message: string
      }>
    }

    // Clear existing data if requested
    if (clearExisting) {
      try {
        await prisma.$transaction(async (tx) => {
          // Delete related records first (foreign key constraints)
          await tx.inquiry.deleteMany()
          await tx.supportTicket.deleteMany()
          await tx.formationRequest.deleteMany()
          await tx.lifeLine.deleteMany()
          
          // Keep admin users, but delete demo users
          await tx.user.deleteMany({
            where: {
              AND: [
                { role: { not: 'ADMIN' } },
                { 
                  email: { 
                    in: [
                      'support@sainthelen.org',
                      'maria.fusillo@example.com',
                      'john.smith@example.com',
                      'sarah.johnson@example.com'
                    ]
                  }
                }
              ]
            }
          })
        })
        
        results.details.push({
          identifier: 'SYSTEM',
          status: 'imported',
          message: 'Successfully cleared existing demo data'
        })
      } catch (error) {
        results.details.push({
          identifier: 'SYSTEM',
          status: 'error',
          message: `Failed to clear existing data: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
        results.errors++
      }
    }

    // Process each LifeLine
    for (let i = 0; i < importData.length; i++) {
      const lifeLineData = importData[i]
      const identifier = `Row ${i + 1}: ${lifeLineData.title}`

      try {
        // Validate the data
        const validatedData = ImportLifeLineSchema.parse(lifeLineData)

        // Check if a LifeLine with this title already exists
        const existingLifeLine = await prisma.lifeLine.findFirst({
          where: { title: validatedData.title }
        })

        if (existingLifeLine && !clearExisting) {
          results.skipped++
          results.details.push({
            identifier,
            status: 'skipped',
            message: 'LifeLine with this title already exists'
          })
          continue
        }

        // Create or find the leader user
        let leaderId: string | null = null
        if (validatedData.groupLeader) {
          // Try to find existing leader by name
          let leader = await prisma.user.findFirst({
            where: { displayName: validatedData.groupLeader }
          })

          if (!leader) {
            // Create a new leader user
            const leaderEmail = `${validatedData.groupLeader.toLowerCase().replace(/\s+/g, '.')}@sainthelen.org`
            const tempPassword = Math.random().toString(36).slice(-12)
            const hashedPassword = await bcrypt.hash(tempPassword, 12)

            try {
              leader = await prisma.user.create({
                data: {
                  email: leaderEmail,
                  displayName: validatedData.groupLeader,
                  password: hashedPassword,
                  role: UserRole.LIFELINE_LEADER,
                }
              })
              
              results.details.push({
                identifier,
                status: 'imported',
                message: `Created new leader account: ${leaderEmail} (temp password: ${tempPassword})`
              })
            } catch (error) {
              // If email already exists, try to find the user
              leader = await prisma.user.findUnique({
                where: { email: leaderEmail }
              })
            }
          }

          leaderId = leader?.id || null
        }

        // Map status to our enum values
        const status = mapStatusToEnum(validatedData.status)
        
        // Map group type and meeting frequency to our enum values
        const groupType = mapGroupTypeToEnum(validatedData.groupType)
        const meetingFrequency = mapMeetingFrequencyToEnum(validatedData.meetingFrequency)
        const dayOfWeek = mapDayOfWeekToEnum(validatedData.dayOfWeek)

        // Create the LifeLine
        await prisma.lifeLine.create({
          data: {
            title: validatedData.title,
            description: validatedData.description || null,
            subtitle: validatedData.subtitle || null,
            groupLeader: validatedData.groupLeader,
            ...(leaderId && { leaderId }),
            dayOfWeek: dayOfWeek,
            meetingTime: validatedData.meetingTime || null,
            location: validatedData.location || null,
            meetingFrequency: meetingFrequency,
            groupType: groupType,
            agesStages: validatedData.agesStages || [],
            maxParticipants: validatedData.maxParticipants || null,
            duration: validatedData.duration || null,
            cost: validatedData.cost ? String(validatedData.cost) : null,
            childcare: validatedData.childcare || false,
            imageUrl: validatedData.imageUrl || null,
            status: status,
            isVisible: status === 'PUBLISHED',
          }
        })

        results.imported++
        results.details.push({
          identifier,
          status: 'imported',
          message: 'Successfully imported LifeLine'
        })

      } catch (error) {
        results.errors++
        results.details.push({
          identifier,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        })
        console.error(`Import error for ${identifier}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Import API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// Helper functions to map string values to enum values
function mapStatusToEnum(status?: string): 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'FULL' {
  if (!status) return 'PUBLISHED'
  
  const statusUpper = status.toUpperCase()
  if (['PUBLISHED', 'PUBLISH', 'ACTIVE', 'LIVE'].includes(statusUpper)) {
    return 'PUBLISHED'
  } else if (['DRAFT', 'PENDING', 'UNPUBLISHED'].includes(statusUpper)) {
    return 'DRAFT'
  } else if (['ARCHIVED', 'INACTIVE', 'HIDDEN'].includes(statusUpper)) {
    return 'ARCHIVED'
  } else if (['FULL', 'CLOSED', 'COMPLETE'].includes(statusUpper)) {
    return 'FULL'
  }
  return 'PUBLISHED'
}

function mapGroupTypeToEnum(groupType?: string): 'SOCIAL' | 'ACTIVITY' | 'SCRIPTURE_BASED' | 'SUNDAY_BASED' | null {
  if (!groupType) return null
  
  const typeUpper = groupType.toUpperCase()
  if (['SOCIAL', 'FELLOWSHIP', 'COMMUNITY', 'COFFEE'].includes(typeUpper)) {
    return 'SOCIAL'
  } else if (['ACTIVITY', 'ACTIVITIES', 'SPORTS', 'HOBBY', 'CRAFT'].includes(typeUpper)) {
    return 'ACTIVITY'
  } else if (['SCRIPTURE', 'SCRIPTURE_BASED', 'BIBLE', 'STUDY', 'DEVOTION'].includes(typeUpper)) {
    return 'SCRIPTURE_BASED'
  } else if (['SUNDAY', 'SUNDAY_BASED', 'WORSHIP', 'SERVICE'].includes(typeUpper)) {
    return 'SUNDAY_BASED'
  }
  return 'SOCIAL' // Default fallback
}

function mapMeetingFrequencyToEnum(frequency?: string): 'WEEKLY' | 'MONTHLY' | 'SEASONALLY' | null {
  if (!frequency) return null
  
  const freqUpper = frequency.toUpperCase()
  if (['WEEKLY', 'WEEK', 'EVERY_WEEK', 'BIWEEKLY', 'BI-WEEKLY'].includes(freqUpper)) {
    return 'WEEKLY'
  } else if (['MONTHLY', 'MONTH', 'EVERY_MONTH'].includes(freqUpper)) {
    return 'MONTHLY'
  } else if (['QUARTERLY', 'QUARTER', 'SEASONALLY', 'SEASONAL', 'AS_NEEDED', 'FLEXIBLE', 'VARIES'].includes(freqUpper)) {
    return 'SEASONALLY'
  }
  return null
}

function mapDayOfWeekToEnum(day?: string): 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY' | null {
  if (!day) return null
  
  const dayUpper = day.toUpperCase()
  if (['MONDAY', 'MON', 'M'].includes(dayUpper)) {
    return 'MONDAY'
  } else if (['TUESDAY', 'TUE', 'T'].includes(dayUpper)) {
    return 'TUESDAY'
  } else if (['WEDNESDAY', 'WED', 'W'].includes(dayUpper)) {
    return 'WEDNESDAY'
  } else if (['THURSDAY', 'THU', 'TH'].includes(dayUpper)) {
    return 'THURSDAY'
  } else if (['FRIDAY', 'FRI', 'F'].includes(dayUpper)) {
    return 'FRIDAY'
  } else if (['SATURDAY', 'SAT', 'S'].includes(dayUpper)) {
    return 'SATURDAY'
  } else if (['SUNDAY', 'SUN', 'SU'].includes(dayUpper)) {
    return 'SUNDAY'
  }
  return null
}