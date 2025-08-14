const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupDemoData() {
  try {
    console.log('🧹 Starting demo data cleanup...')

    // Get all LifeLines to see what we're working with
    const allLifeLines = await prisma.lifeLine.findMany({
      select: {
        id: true,
        title: true,
        groupLeader: true,
        createdAt: true,
        _count: {
          select: {
            inquiries: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('\n📋 Current LifeLines:')
    allLifeLines.forEach((ll, index) => {
      console.log(`${index + 1}. ${ll.title} (Leader: ${ll.groupLeader}) - ${ll._count.inquiries} inquiries`)
      console.log(`   ID: ${ll.id}`)
      console.log(`   Created: ${ll.createdAt.toISOString()}`)
      console.log('')
    })

    // Demo/test LifeLines to remove (these are likely demo data)
    const demoKeywords = [
      'test',
      'demo',
      'sample',
      'example',
      'bible study', // if it's a generic one
      'young adults bible study',
      'women\'s',
      'men\'s',
      'couples',
      'seniors'
    ]

    const potentialDemoLifeLines = allLifeLines.filter(ll => {
      const title = ll.title.toLowerCase()
      const leader = ll.groupLeader.toLowerCase()
      
      return demoKeywords.some(keyword => 
        title.includes(keyword) || leader.includes(keyword)
      ) || 
      // Also check if leader contains common test names
      ['john doe', 'jane doe', 'test user', 'maria fusillo'].some(testName =>
        leader.includes(testName)
      )
    })

    if (potentialDemoLifeLines.length > 0) {
      console.log('🎯 Potential demo LifeLines identified:')
      potentialDemoLifeLines.forEach((ll, index) => {
        console.log(`${index + 1}. ${ll.title} (${ll.groupLeader})`)
      })
      
      console.log('\n⚠️  To delete these, run: node scripts/cleanup-demo-data.js --confirm')
      
      if (process.argv.includes('--confirm')) {
        console.log('\n🗑️  Deleting demo LifeLines...')
        
        for (const lifeline of potentialDemoLifeLines) {
          // Delete inquiries first
          await prisma.inquiry.deleteMany({
            where: { lifeLineId: lifeline.id }
          })
          
          // Delete the LifeLine
          await prisma.lifeLine.delete({
            where: { id: lifeline.id }
          })
          
          console.log(`✅ Deleted: ${lifeline.title}`)
        }
        
        console.log(`\n🎉 Cleaned up ${potentialDemoLifeLines.length} demo LifeLines`)
      }
    } else {
      console.log('✨ No obvious demo LifeLines found')
    }

    // Also clean up any test formation requests
    const testFormationRequests = await prisma.formationRequest.findMany({
      where: {
        OR: [
          { leaderEmail: { contains: 'test' } },
          { leaderEmail: { contains: 'example.com' } },
          { groupLeader: { contains: 'Test' } },
          { groupLeader: { contains: 'Demo' } }
        ]
      }
    })

    if (testFormationRequests.length > 0) {
      console.log(`\n📋 Found ${testFormationRequests.length} test formation requests`)
      testFormationRequests.forEach(req => {
        console.log(`- ${req.title || 'Untitled'} (${req.groupLeader} - ${req.leaderEmail})`)
      })
      
      if (process.argv.includes('--confirm')) {
        for (const req of testFormationRequests) {
          // Delete votes and comments first
          await prisma.formationVote.deleteMany({ where: { requestId: req.id } })
          await prisma.formationComment.deleteMany({ where: { requestId: req.id } })
          await prisma.formationRequest.delete({ where: { id: req.id } })
          console.log(`✅ Deleted formation request: ${req.title || 'Untitled'}`)
        }
      }
    }

    // Clean up test support tickets  
    const testTickets = await prisma.supportTicket.findMany({
      where: {
        OR: [
          { subject: { contains: 'test', mode: 'insensitive' } },
          { description: { contains: 'test', mode: 'insensitive' } }
        ]
      }
    })

    if (testTickets.length > 0) {
      console.log(`\n📋 Found ${testTickets.length} test support tickets`)
      if (process.argv.includes('--confirm')) {
        for (const ticket of testTickets) {
          await prisma.ticketResponse.deleteMany({ where: { supportTicketId: ticket.id } })
          await prisma.supportTicket.delete({ where: { id: ticket.id } })
          console.log(`✅ Deleted support ticket: ${ticket.subject}`)
        }
      }
    }

    // Show final counts
    const finalCounts = await Promise.all([
      prisma.lifeLine.count(),
      prisma.formationRequest.count(),
      prisma.supportTicket.count(),
      prisma.user.count()
    ])

    console.log('\n📊 Final database counts:')
    console.log(`- LifeLines: ${finalCounts[0]}`)
    console.log(`- Formation Requests: ${finalCounts[1]}`)
    console.log(`- Support Tickets: ${finalCounts[2]}`)
    console.log(`- Users: ${finalCounts[3]}`)

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupDemoData()