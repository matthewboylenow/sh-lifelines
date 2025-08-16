import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { UserRole } from '@prisma/client'
import { ZodError } from 'zod'

export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { 
      success: false, 
      error: message,
      timestamp: new Date().toISOString()
    }, 
    { status }
  )
}

export function createSuccessResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  })
}

export function withAuth(
  handler: (req: NextRequest, session: any) => Promise<NextResponse>,
  allowedRoles?: UserRole[]
) {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions)
      
      if (!session || !session.user) {
        return createErrorResponse('Unauthorized', 401)
      }

      if (allowedRoles && !allowedRoles.includes(session.user.role)) {
        return createErrorResponse('Forbidden', 403)
      }

      return await handler(req, session)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return createErrorResponse('Internal server error', 500)
    }
  }
}

export function withValidation<T>(
  schema: any,
  handler: (req: NextRequest, validatedData: T, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      const body = await req.json()
      const validatedData = schema.parse(body)
      return await handler(req, validatedData, ...args)
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          `Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`,
          422
        )
      }
      console.error('Validation error:', error)
      return createErrorResponse('Invalid request data', 400)
    }
  }
}

export function withErrorHandling(
  handler: (...args: any[]) => Promise<NextResponse>
) {
  return async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('API error:', error)
      
      if (error instanceof Error) {
        return createErrorResponse(error.message, 500)
      }
      
      return createErrorResponse('Internal server error', 500)
    }
  }
}

export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit)
  
  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}