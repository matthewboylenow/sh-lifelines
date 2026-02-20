import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
  withAuth,
  withValidation
} from '@/lib/api-utils'
import { commentOnFormationRequestSchema } from '@/lib/validations'
import { UserRole } from '@prisma/client'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/formation-requests/[id]/comments - Get all comments for a formation request
export async function GET(req: NextRequest, context: RouteParams) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const { params } = context
      const { id } = await params

      const formationRequest = await prisma.formationRequest.findUnique({
        where: { id },
      })

      if (!formationRequest) {
        return createErrorResponse('Formation request not found', 404)
      }

      const comments = await prisma.formationComment.findMany({
        where: { requestId: id },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      return createSuccessResponse(comments)
    } catch (error) {
      console.error('Error fetching comments:', error)
      return createErrorResponse('Failed to fetch comments', 500)
    }
  }, [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN])(req)
}

// POST /api/formation-requests/[id]/comments - Add a comment to a formation request
export async function POST(req: NextRequest, context: RouteParams) {
  return withAuth(async (req: NextRequest, session: any) => {
    return withValidation(
      commentOnFormationRequestSchema,
      async (req: NextRequest, validatedData: any) => {
        try {
          const { params } = context
          const { id } = await params
          const { content } = validatedData

          const formationRequest = await prisma.formationRequest.findUnique({
            where: { id },
          })

          if (!formationRequest) {
            return createErrorResponse('Formation request not found', 404)
          }

          const comment = await prisma.formationComment.create({
            data: {
              content,
              requestId: id,
              authorId: session.user.id,
            },
            include: {
              author: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                }
              }
            }
          })

          return createSuccessResponse(comment, 'Comment added successfully')
        } catch (error) {
          console.error('Error adding comment:', error)
          return createErrorResponse('Failed to add comment', 500)
        }
      }
    )(req)
  }, [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN])(req)
}
