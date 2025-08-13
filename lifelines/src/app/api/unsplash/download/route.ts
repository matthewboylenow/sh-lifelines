import { NextRequest } from 'next/server'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  withAuth,
  withValidation 
} from '@/lib/api-utils'
import { unsplashDownloadSchema } from '@/lib/validations'
import { UserRole } from '@prisma/client'

// POST /api/unsplash/download - Track Unsplash download (required by Unsplash API guidelines)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = unsplashDownloadSchema.parse(body)
    const { downloadLocation } = validatedData
        // Check if Unsplash access key is configured
        if (!process.env.UNSPLASH_ACCESS_KEY) {
          return createErrorResponse('Unsplash integration not configured', 503)
        }

        // Track download with Unsplash (required by their API guidelines)
        const response = await fetch(downloadLocation, {
          headers: {
            'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
            'Accept-Version': 'v1'
          }
        })

        if (!response.ok) {
          console.error('Unsplash download tracking error:', response.status, response.statusText)
          // Don't fail completely if tracking fails - return success anyway
          return createSuccessResponse(null, 'Image selected (download tracking failed)')
        }

        const data = await response.json()

      return createSuccessResponse({
        url: data.url,
        tracked: true
      }, 'Image selection tracked successfully')
  } catch (error) {
    console.error('Error tracking Unsplash download:', error)
    // Don't fail completely if tracking fails
    return createSuccessResponse(null, 'Image selected (download tracking failed)')
  }
}