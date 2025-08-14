import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse,
  withAuth 
} from '@/lib/api-utils'
import { UserRole, FormationStatus } from '@prisma/client'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/formation-requests/[id] - Get specific formation request
export async function GET(req: NextRequest, context: RouteParams) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const { params } = context
      const { id } = await params

      const request = await prisma.formationRequest.findUnique({
        where: { id },
        include: {
          submitter: {
            select: {
              id: true,
              displayName: true,
              email: true,
            }
          },
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          comments: {
            include: {
              author: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          createdLifeLine: {
            select: {
              id: true,
              title: true,
              status: true,
            }
          },
        },
      })

      if (!request) {
        return createErrorResponse('Formation request not found', 404)
      }

      return createSuccessResponse(request)
    } catch (error) {
      console.error('Error fetching formation request:', error)
      return createErrorResponse('Failed to fetch formation request', 500)
    }
  }, [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN])(req)
}

// PUT /api/formation-requests/[id] - Update formation request status (Admin only)
export async function PUT(req: NextRequest, context: RouteParams) {
  return withAuth(async (req: NextRequest, session: any) => {
    try {
      const { params } = context
      const { id } = await params
      const body = await req.json()
      const { status, adminNote } = body

      if (!Object.values(FormationStatus).includes(status)) {
        return createErrorResponse('Invalid status', 400)
      }

      const request = await prisma.formationRequest.findUnique({
        where: { id }
      })

      if (!request) {
        return createErrorResponse('Formation request not found', 404)
      }

      const updateData: any = { status }
      
      if (adminNote) {
        updateData.adminNote = adminNote
      }

      const updatedRequest = await prisma.formationRequest.update({
        where: { id },
        data: updateData,
        include: {
          submitter: {
            select: {
              id: true,
              displayName: true,
              email: true,
            }
          },
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                }
              }
            }
          },
          createdLifeLine: {
            select: {
              id: true,
              title: true,
              status: true,
            }
          },
        },
      })

      return createSuccessResponse(updatedRequest, 'Formation request updated successfully')
    } catch (error) {
      console.error('Error updating formation request:', error)
      return createErrorResponse('Failed to update formation request', 500)
    }
  }, [UserRole.ADMIN])(req)
}