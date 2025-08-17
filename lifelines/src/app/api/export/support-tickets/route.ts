import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/api-utils'
import { UserRole } from '@prisma/client'

// GET /api/export/support-tickets - Export support tickets as CSV
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check authentication and authorization
    if (!session) {
      return createErrorResponse('Unauthorized', 401)
    }

    const allowedRoles: UserRole[] = [UserRole.FORMATION_SUPPORT_TEAM, UserRole.ADMIN]
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return createErrorResponse('Insufficient permissions', 403)
    }

    // Fetch support tickets with responses
    const supportTickets = await prisma.supportTicket.findMany({
      include: {
        requester: {
          select: {
            email: true,
            displayName: true
          }
        },
        responses: {
          include: {
            author: {
              select: {
                email: true,
                displayName: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            responses: true
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
      'Reference Number',
      'Subject',
      'Message',
      'Type',
      'Priority',
      'Status',
      'Customer Name',
      'Customer Email',
      'Response Count',
      'Last Response Date',
      'Created Date',
      'Updated Date',
      'Resolution Date'
    ].join(',')

    const csvRows = supportTickets.map(ticket => {
      const lastResponse = ticket.responses[ticket.responses.length - 1]
      
      return [
        ticket.id,
        `"${(ticket.referenceNumber || '').replace(/"/g, '""')}"`,
        `"${(ticket.subject || '').replace(/"/g, '""')}"`,
        `"${(ticket.description || '').replace(/"/g, '""')}"`,
        ticket.ticketType || '',
        ticket.priority || '',
        ticket.status,
        `"${(ticket.requester?.displayName || '').replace(/"/g, '""')}"`,
        `"${(ticket.requester?.email || '').replace(/"/g, '""')}"`,
        ticket._count.responses,
        lastResponse?.createdAt?.toISOString() || '',
        ticket.createdAt.toISOString(),
        ticket.updatedAt.toISOString(),
        ticket.resolvedAt?.toISOString() || ''
      ].join(',')
    })

    const csvContent = [csvHeaders, ...csvRows].join('\n')

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="support-tickets-export.csv"',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Support tickets export error:', error)
    return createErrorResponse('Export failed', 500)
  }
}