const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function removeRemainingDemo() {
  try {
    // Remove the sample LifeLine
    await prisma.inquiry.deleteMany({
      where: { lifeLineId: 'sample-lifeline-2' }
    })
    
    await prisma.lifeLine.delete({
      where: { id: 'sample-lifeline-2' }
    })
    
    console.log('✅ Removed remaining demo LifeLine')
    
    // Show final counts
    const counts = await Promise.all([
      prisma.lifeLine.count(),
      prisma.inquiry.count(),
      prisma.user.count()
    ])
    
    console.log('\n📊 Final clean database:')
    console.log(`- LifeLines: ${counts[0]}`)
    console.log(`- Inquiries: ${counts[1]}`)
    console.log(`- Users: ${counts[2]}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removeRemainingDemo()