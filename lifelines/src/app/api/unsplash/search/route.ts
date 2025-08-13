import { NextRequest } from 'next/server'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  withAuth,
  withValidation,
  parsePaginationParams 
} from '@/lib/api-utils'
import { unsplashSearchSchema } from '@/lib/validations'
import { UserRole } from '@prisma/client'

// POST /api/unsplash/search - Search Unsplash images
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = unsplashSearchSchema.parse(body)
    const { query, page = 1, per_page = 12 } = validatedData
        // Check if Unsplash access key is configured
        if (!process.env.UNSPLASH_ACCESS_KEY) {
          return createErrorResponse('Unsplash integration not configured', 503)
        }

        // Make request to Unsplash API
        const unsplashUrl = new URL('https://api.unsplash.com/search/photos')
        unsplashUrl.searchParams.set('query', query)
        unsplashUrl.searchParams.set('page', page.toString())
        unsplashUrl.searchParams.set('per_page', per_page.toString())
        unsplashUrl.searchParams.set('orientation', 'landscape') // Prefer landscape images

        const response = await fetch(unsplashUrl.toString(), {
          headers: {
            'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
            'Accept-Version': 'v1'
          }
        })

        if (!response.ok) {
          console.error('Unsplash API error:', response.status, response.statusText)
          return createErrorResponse('Failed to search images', response.status)
        }

        const data = await response.json()

        // Transform data for our use
        const transformedResults = {
          results: data.results.map((photo: any) => ({
            id: photo.id,
            alt_description: photo.alt_description || photo.description || '',
            urls: {
              thumb: photo.urls.thumb,
              small: photo.urls.small,
              regular: photo.urls.regular,
              full: photo.urls.full
            },
            width: photo.width,
            height: photo.height,
            color: photo.color,
            user: {
              name: photo.user.name,
              username: photo.user.username,
              profile_url: `https://unsplash.com/@${photo.user.username}`
            },
            download_location: photo.links.download_location
          })),
          total: data.total,
          total_pages: data.total_pages
        }

      return createSuccessResponse(transformedResults)
  } catch (error) {
    console.error('Error searching Unsplash:', error)
    return createErrorResponse('Failed to search images', 500)
  }
}