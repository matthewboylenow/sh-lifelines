import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/api-utils'
import { UserRole } from '@prisma/client'

// For ZIP creation, we'll use JSZip (needs to be installed)
// This is a simplified implementation that concatenates CSVs
// For production, you'd want to use a proper ZIP library

// POST /api/export/bulk - Export multiple datasets as ZIP
export async function POST(req: NextRequest) {
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

    const { exports } = await req.json()
    
    if (!Array.isArray(exports) || exports.length === 0) {
      return createErrorResponse('No exports specified', 400)
    }

    // Valid export types
    const validExports = ['lifelines', 'inquiries', 'formation-requests', 'support-tickets', 'users']
    const requestedExports = exports.filter(exp => validExports.includes(exp))

    if (requestedExports.length === 0) {
      return createErrorResponse('No valid exports specified', 400)
    }

    // For now, we'll create a single large CSV with multiple sections
    // In production, you'd create individual CSV files and ZIP them
    let combinedContent = `# LifeLines Bulk Export\n# Generated: ${new Date().toISOString()}\n# Exports: ${requestedExports.join(', ')}\n\n`

    // Export LifeLines if requested
    if (requestedExports.includes('lifelines')) {
      const lifeLines = await prisma.lifeLine.findMany({
        include: {
          leader: { select: { email: true, displayName: true } },
          _count: { select: { inquiries: true } }
        }
      })

      combinedContent += '=== LIFELINES DATA ===\n'
      combinedContent += 'ID,Title,Group Leader,Leader Email,Status,Inquiry Count,Created Date\n'
      
      lifeLines.forEach(ll => {
        combinedContent += `${ll.id},"${ll.title?.replace(/"/g, '""') || ''}","${ll.groupLeader?.replace(/"/g, '""') || ''}","${ll.leader?.email?.replace(/"/g, '""') || ''}",${ll.status},${ll._count.inquiries},${ll.createdAt.toISOString()}\n`
      })
      combinedContent += '\n'
    }

    // Export Inquiries if requested
    if (requestedExports.includes('inquiries')) {
      const inquiries = await prisma.inquiry.findMany({
        include: {
          lifeLine: { select: { title: true, groupLeader: true } }
        }
      })

      combinedContent += '=== INQUIRIES DATA ===\n'
      combinedContent += 'ID,Person Name,Person Email,LifeLine Title,Status,Created Date\n'
      
      inquiries.forEach(inq => {
        combinedContent += `${inq.id},"${inq.personName?.replace(/"/g, '""') || ''}","${inq.personEmail?.replace(/"/g, '""') || ''}","${inq.lifeLine.title?.replace(/"/g, '""') || ''}",${inq.status},${inq.createdAt.toISOString()}\n`
      })
      combinedContent += '\n'
    }

    // Export Formation Requests if requested
    if (requestedExports.includes('formation-requests')) {
      const formationRequests = await prisma.formationRequest.findMany({
        include: {
          _count: { select: { votes: true } }
        }
      })

      combinedContent += '=== FORMATION REQUESTS DATA ===\n'
      combinedContent += 'ID,Title,Group Leader,Leader Email,Status,Vote Count,Created Date\n'
      
      formationRequests.forEach(fr => {
        combinedContent += `${fr.id},"${fr.title?.replace(/"/g, '""') || ''}","${fr.groupLeader?.replace(/"/g, '""') || ''}","${fr.leaderEmail?.replace(/"/g, '""') || ''}",${fr.status},${fr._count.votes},${fr.createdAt.toISOString()}\n`
      })
      combinedContent += '\n'
    }

    // Export Support Tickets if requested
    if (requestedExports.includes('support-tickets')) {
      const supportTickets = await prisma.supportTicket.findMany({
        include: {
          requester: { select: { email: true, displayName: true } },
          _count: { select: { responses: true } }
        }
      })

      combinedContent += '=== SUPPORT TICKETS DATA ===\n'
      combinedContent += 'ID,Reference Number,Subject,Customer Email,Status,Response Count,Created Date\n'
      
      supportTickets.forEach(st => {
        combinedContent += `${st.id},"${st.referenceNumber?.replace(/"/g, '""') || ''}","${st.subject?.replace(/"/g, '""') || ''}","${st.requester?.email?.replace(/"/g, '""') || ''}",${st.status},${st._count.responses},${st.createdAt.toISOString()}\n`
      })
      combinedContent += '\n'
    }

    // Export Users if requested (Admin only)
    if (requestedExports.includes('users') && session.user.role === UserRole.ADMIN) {
      const users = await prisma.user.findMany({
        include: {
          _count: { select: { ledLifeLines: true } }
        }
      })

      combinedContent += '=== USERS DATA ===\n'
      combinedContent += 'ID,Email,Display Name,Role,Active,Led LifeLines,Created Date\n'
      
      users.forEach(user => {
        combinedContent += `${user.id},"${user.email?.replace(/"/g, '""') || ''}","${user.displayName?.replace(/"/g, '""') || ''}",${user.role},${user.isActive ? 'Yes' : 'No'},${user._count.ledLifeLines},${user.createdAt.toISOString()}\n`
      })
      combinedContent += '\n'
    }

    const fileName = `lifelines-bulk-export-${new Date().toISOString().split('T')[0]}.csv`

    // Return combined CSV file
    // In production, you'd create a proper ZIP file
    return new Response(combinedContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Bulk export error:', error)
    return createErrorResponse('Bulk export failed', 500)
  }
}