import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/api-utils'
import { UserRole } from '@prisma/client'

// GET /api/export/users - Export user accounts as CSV
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check authentication and authorization
    if (!session) {
      return createErrorResponse('Unauthorized', 401)
    }

    // Only admins can export user data
    if (session.user.role !== UserRole.ADMIN) {
      return createErrorResponse('Insufficient permissions - Admin required', 403)
    }

    // Fetch users with related counts
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            ledLifeLines: true,
            formationRequests: true,
            supportTickets: true,
            votes: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Convert to CSV format
    const csvHeaders = [
      'ID',
      'Email',
      'Display Name',
      'Role',
      'Active',
      'Led LifeLines',
      'Formation Requests',
      'Support Tickets',
      'Votes Cast',
      'Is Active',
      'Reserved',
      'Created Date',
      'Updated Date'
    ].join(',')

    const csvRows = users.map(user => [
      user.id,
      `"${(user.email || '').replace(/"/g, '""')}"`,
      `"${(user.displayName || '').replace(/"/g, '""')}"`,
      user.role,
      user.isActive ? 'Yes' : 'No',
      user._count.ledLifeLines,
      user._count.formationRequests,
      user._count.supportTickets,
      user._count.votes,
      user.isActive ? 'Yes' : 'No',
      '',
      user.createdAt.toISOString(),
      user.updatedAt.toISOString()
    ].join(','))

    const csvContent = [csvHeaders, ...csvRows].join('\n')

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="users-export.csv"',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Users export error:', error)
    return createErrorResponse('Export failed', 500)
  }
}