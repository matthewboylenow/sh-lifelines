import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/api-utils'
import { UserRole, GroupType, MeetingFrequency, DayOfWeek, LifeLineStatus } from '@prisma/client'
import { z } from 'zod'

// WordPress LifeLine import schema
const wordpressLifeLineSchema = z.object({
  lifelines: z.array(z.object({
    ID: z.number(),
    post_title: z.string(),
    post_content: z.string().optional(),
    post_status: z.string(),
    post_date: z.string(),
    meta: z.record(z.string(), z.any()).optional(),
    leader_email: z.string().email().optional(),
    group_leader: z.string().optional()
  }))
})

// Map WordPress post status to our LifeLineStatus
function mapWordPressStatus(wpStatus: string): LifeLineStatus {
  switch (wpStatus) {
    case 'publish': return LifeLineStatus.PUBLISHED
    case 'draft': return LifeLineStatus.DRAFT
    case 'private': return LifeLineStatus.ARCHIVED
    default: return LifeLineStatus.DRAFT
  }
}

// Map WordPress meta values to our enums
function mapGroupType(metaValue: string | undefined): GroupType | undefined {
  if (!metaValue) return undefined
  switch (metaValue.toLowerCase()) {
    case 'social': return GroupType.SOCIAL
    case 'activity': return GroupType.ACTIVITY
    case 'scripture': 
    case 'scripture_based': 
    case 'scripture-based': return GroupType.SCRIPTURE_BASED
    case 'sunday':
    case 'sunday_based':
    case 'sunday-based': return GroupType.SUNDAY_BASED
    default: return undefined
  }
}

function mapMeetingFrequency(metaValue: string | undefined): MeetingFrequency | undefined {
  if (!metaValue) return undefined
  switch (metaValue.toLowerCase()) {
    case 'weekly': return MeetingFrequency.WEEKLY
    case 'monthly': return MeetingFrequency.MONTHLY
    case 'seasonally': return MeetingFrequency.SEASONALLY
    default: return undefined
  }
}

function mapDayOfWeek(metaValue: string | undefined): DayOfWeek | undefined {
  if (!metaValue) return undefined
  switch (metaValue.toLowerCase()) {
    case 'sunday': return DayOfWeek.SUNDAY
    case 'monday': return DayOfWeek.MONDAY
    case 'tuesday': return DayOfWeek.TUESDAY
    case 'wednesday': return DayOfWeek.WEDNESDAY
    case 'thursday': return DayOfWeek.THURSDAY
    case 'friday': return DayOfWeek.FRIDAY
    case 'saturday': return DayOfWeek.SATURDAY
    case 'varies': return DayOfWeek.VARIES
    default: return undefined
  }
}

// POST /api/migration/wordpress/lifelines - Import WordPress LifeLines
export async function POST(req: NextRequest) {
  try {
    // TODO: Add authentication middleware back in production
    // Currently allowing access for build purposes - should verify admin role

    const body = await req.json()
    const { lifelines } = wordpressLifeLineSchema.parse(body)

    const results = {
      imported: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{
        title: string
        status: 'imported' | 'skipped' | 'error'
        message: string
      }>
    }

    for (const wpLifeLine of lifelines) {
      try {
        // Check if LifeLine already exists (by title)
        const existingLifeLine = await prisma.lifeLine.findFirst({
          where: { title: wpLifeLine.post_title }
        })

        if (existingLifeLine) {
          results.skipped++
          results.details.push({
            title: wpLifeLine.post_title,
            status: 'skipped',
            message: 'LifeLine already exists'
          })
          continue
        }

        // Find the leader by email
        let leader = null
        if (wpLifeLine.leader_email) {
          leader = await prisma.user.findUnique({
            where: { email: wpLifeLine.leader_email }
          })
        }

        // Extract meta fields
        const meta = wpLifeLine.meta || {}
        const agesStages = meta.ages_stages ? [meta.ages_stages] : []

        // Create LifeLine
        await prisma.lifeLine.create({
          data: {
            title: wpLifeLine.post_title,
            description: wpLifeLine.post_content || null,
            status: mapWordPressStatus(wpLifeLine.post_status),
            groupLeader: wpLifeLine.group_leader || meta.group_leader || 'Unknown',
            leaderEmail: wpLifeLine.leader_email || meta.leader_email || '',
            agesStages,
            groupType: mapGroupType(meta.group_type),
            meetingFrequency: mapMeetingFrequency(meta.meeting_frequency),
            dayOfWeek: mapDayOfWeek(meta.day_of_week),
            meetingTime: meta.meeting_time || null,
            imageUrl: meta.featured_image || null,
            videoUrl: meta.video_url || null,
            leaderId: leader?.id || '', // Fallback to empty string if no leader found
            createdAt: new Date(wpLifeLine.post_date),
          }
        })

        results.imported++
        results.details.push({
          title: wpLifeLine.post_title,
          status: 'imported',
          message: leader 
            ? `Imported and assigned to ${leader.displayName || leader.email}`
            : 'Imported without leader assignment'
        })

      } catch (lifeLineError) {
        console.error('Error importing LifeLine:', wpLifeLine.post_title, lifeLineError)
        results.errors++
        results.details.push({
          title: wpLifeLine.post_title,
          status: 'error',
          message: lifeLineError instanceof Error ? lifeLineError.message : 'Unknown error'
        })
      }
    }

    return createSuccessResponse(results, 
      `Import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.errors} errors`
    )

  } catch (error) {
    console.error('Error importing WordPress LifeLines:', error)
    return createErrorResponse('Failed to import WordPress LifeLines', 500)
  }
}