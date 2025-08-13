import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/api-utils'
import { InquiryStatus } from '@prisma/client'
import { z } from 'zod'

// WordPress inquiry import schema
const wordpressInquirySchema = z.object({
  inquiries: z.array(z.object({
    ID: z.number(),
    person_name: z.string(),
    person_email: z.string().email().optional(),
    person_phone: z.string().optional(),
    message: z.string().optional(),
    lifeline_id: z.number().optional(),
    lifeline_title: z.string().optional(),
    status: z.string().optional(),
    date_created: z.string(),
    meta: z.record(z.string(), z.any()).optional()
  }))
})

// Map WordPress inquiry status to our InquiryStatus
function mapInquiryStatus(wpStatus: string | undefined): InquiryStatus {
  if (!wpStatus) return InquiryStatus.UNDECIDED
  switch (wpStatus.toLowerCase()) {
    case 'joined': return InquiryStatus.JOINED
    case 'not_joined':
    case 'not-joined': return InquiryStatus.NOT_JOINED
    case 'undecided':
    default: return InquiryStatus.UNDECIDED
  }
}

// POST /api/migration/wordpress/inquiries - Import WordPress inquiries
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { inquiries } = wordpressInquirySchema.parse(body)

    const results = {
      imported: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{
        name: string
        status: 'imported' | 'skipped' | 'error'
        message: string
      }>
    }

    for (const wpInquiry of inquiries) {
      try {
        // Find the LifeLine by ID or title
        let lifeLine = null
        
        if (wpInquiry.lifeline_title) {
          lifeLine = await prisma.lifeLine.findFirst({
            where: { title: wpInquiry.lifeline_title }
          })
        }

        if (!lifeLine) {
          results.errors++
          results.details.push({
            name: wpInquiry.person_name,
            status: 'error',
            message: `Could not find LifeLine: ${wpInquiry.lifeline_title || 'Unknown'}`
          })
          continue
        }

        // Check if inquiry already exists (by name, email, and LifeLine)
        const existingInquiry = await prisma.inquiry.findFirst({
          where: {
            personName: wpInquiry.person_name,
            personEmail: wpInquiry.person_email || '',
            lifeLineId: lifeLine.id
          }
        })

        if (existingInquiry) {
          results.skipped++
          results.details.push({
            name: wpInquiry.person_name,
            status: 'skipped',
            message: 'Inquiry already exists'
          })
          continue
        }

        // Create inquiry
        await prisma.inquiry.create({
          data: {
            personName: wpInquiry.person_name,
            personEmail: wpInquiry.person_email || '',
            personPhone: wpInquiry.person_phone || null,
            message: wpInquiry.message || null,
            lifeLineId: lifeLine.id,
            status: mapInquiryStatus(wpInquiry.status),
            createdAt: new Date(wpInquiry.date_created),
          }
        })

        results.imported++
        results.details.push({
          name: wpInquiry.person_name,
          status: 'imported',
          message: `Imported inquiry for LifeLine: ${lifeLine.title}`
        })

      } catch (inquiryError) {
        console.error('Error importing inquiry:', wpInquiry.person_name, inquiryError)
        results.errors++
        results.details.push({
          name: wpInquiry.person_name,
          status: 'error',
          message: inquiryError instanceof Error ? inquiryError.message : 'Unknown error'
        })
      }
    }

    return createSuccessResponse(results, 
      `Import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.errors} errors`
    )

  } catch (error) {
    console.error('Error importing WordPress inquiries:', error)
    return createErrorResponse('Failed to import WordPress inquiries', 500)
  }
}