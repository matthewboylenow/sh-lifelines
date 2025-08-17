import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/api-utils'
import { UserRole } from '@prisma/client'

// GET /api/export/inquiries - Export member inquiries as CSV
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

    // Fetch inquiries data with related information
    const inquiries = await prisma.inquiry.findMany({
      include: {
        lifeLine: {
          select: {
            id: true,
            title: true,
            groupLeader: true,
            status: true
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
      'Person Name',
      'Person Email',
      'Person Phone',
      'Message',
      'Status',
      'LifeLine ID',
      'LifeLine Title',
      'LifeLine Leader',
      'LifeLine Status',
      'Inquiry Date',
      'Updated Date'
    ].join(',')

    const csvRows = inquiries.map(inquiry => [
      inquiry.id,
      `"${(inquiry.personName || '').replace(/"/g, '""')}"`,
      `"${(inquiry.personEmail || '').replace(/"/g, '""')}"`,
      `"${(inquiry.personPhone || '').replace(/"/g, '""')}"`,
      `"${(inquiry.message || '').replace(/"/g, '""')}"`,
      inquiry.status,
      inquiry.lifeLineId,
      `"${(inquiry.lifeLine.title || '').replace(/"/g, '""')}"`,
      `"${(inquiry.lifeLine.groupLeader || '').replace(/"/g, '""')}"`,
      inquiry.lifeLine.status,
      inquiry.createdAt.toISOString(),
      inquiry.updatedAt.toISOString()
    ].join(','))

    const csvContent = [csvHeaders, ...csvRows].join('\n')

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="inquiries-export.csv"',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Inquiries export error:', error)
    return createErrorResponse('Export failed', 500)
  }
}