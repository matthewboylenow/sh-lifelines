import { PrismaClient, UserRole, LifeLineStatus, GroupType, MeetingFrequency, DayOfWeek, FormationStatus, InquiryStatus, TicketStatus, TicketPriority, ResourceType } from '@prisma/client'
import { hashPassword } from '../src/lib/auth-utils'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const adminPassword = await hashPassword('admin123')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sainthelen.org' },
    update: {},
    create: {
      email: 'admin@sainthelen.org',
      password: adminPassword,
      displayName: 'System Administrator',
      role: UserRole.ADMIN,
      isActive: true,
    },
  })
  console.log('✅ Created admin user:', admin.email)

  // Create formation support team member
  const supportPassword = await hashPassword('support123')
  const supportUser = await prisma.user.upsert({
    where: { email: 'formation@sainthelen.org' },
    update: {},
    create: {
      email: 'formation@sainthelen.org',
      password: supportPassword,
      displayName: 'Formation Support Team',
      role: UserRole.FORMATION_SUPPORT_TEAM,
      isActive: true,
    },
  })
  console.log('✅ Created formation support user:', supportUser.email)

  // Create sample LifeLine leaders
  const leaderPassword = await hashPassword('leader123')
  const leader1 = await prisma.user.upsert({
    where: { email: 'leader1@sainthelen.org' },
    update: {},
    create: {
      email: 'leader1@sainthelen.org',
      password: leaderPassword,
      displayName: 'John Smith',
      role: UserRole.LIFELINE_LEADER,
      isActive: true,
    },
  })

  const leader2 = await prisma.user.upsert({
    where: { email: 'leader2@sainthelen.org' },
    update: {},
    create: {
      email: 'leader2@sainthelen.org',
      password: leaderPassword,
      displayName: 'Sarah Johnson',
      role: UserRole.LIFELINE_LEADER,
      isActive: true,
    },
  })
  console.log('✅ Created sample leaders')

  // Create sample LifeLines
  const lifeLine1 = await prisma.lifeLine.upsert({
    where: { id: 'sample-lifeline-1' },
    update: {},
    create: {
      id: 'sample-lifeline-1',
      title: 'Young Adults Scripture Study',
      description: 'A weekly Bible study focused on applying Scripture to daily life for young adults (ages 18-30).',
      status: LifeLineStatus.PUBLISHED,
      groupLeader: 'John Smith',
      leaderEmail: 'leader1@sainthelen.org',
      agesStages: ['Young Adults (18-30)'],
      meetingFrequency: MeetingFrequency.WEEKLY,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      groupType: GroupType.SCRIPTURE_BASED,
      meetingTime: '7:00 PM',
      leaderId: leader1.id,
    },
  })

  const lifeLine2 = await prisma.lifeLine.upsert({
    where: { id: 'sample-lifeline-2' },
    update: {},
    create: {
      id: 'sample-lifeline-2',
      title: 'Families with Young Children',
      description: 'A supportive community for families with children under 12. We share parenting experiences and grow in faith together.',
      status: LifeLineStatus.PUBLISHED,
      groupLeader: 'Sarah Johnson',
      leaderEmail: 'leader2@sainthelen.org',
      agesStages: ['Families with Young Children'],
      meetingFrequency: MeetingFrequency.WEEKLY,
      dayOfWeek: DayOfWeek.SUNDAY,
      groupType: GroupType.SOCIAL,
      meetingTime: '11:30 AM (after Mass)',
      leaderId: leader2.id,
    },
  })
  console.log('✅ Created sample LifeLines')

  // Create sample inquiries
  await prisma.inquiry.createMany({
    data: [
      {
        personName: 'Mike Wilson',
        personEmail: 'mike@example.com',
        personPhone: '(555) 123-4567',
        message: 'I\'m interested in joining a Bible study group. I\'m new to the area and looking to connect.',
        lifeLineId: lifeLine1.id,
        status: InquiryStatus.UNDECIDED,
      },
      {
        personName: 'Lisa Brown',
        personEmail: 'lisa@example.com',
        message: 'My husband and I have a 3-year-old and would love to connect with other young families.',
        lifeLineId: lifeLine2.id,
        status: InquiryStatus.JOINED,
      },
    ],
  })
  console.log('✅ Created sample inquiries')

  // Create sample formation request
  const formationRequest = await prisma.formationRequest.create({
    data: {
      title: 'Senior Citizens Fellowship',
      description: 'A monthly gathering for seniors (65+) to share fellowship, prayer, and occasional guest speakers.',
      status: FormationStatus.SUBMITTED,
      groupLeader: 'Robert Anderson',
      leaderEmail: 'robert@example.com',
      cellPhone: '(555) 987-6543',
      agesStages: 'Seniors (65+)',
      groupType: GroupType.SOCIAL,
      meetingFrequency: MeetingFrequency.MONTHLY,
      dayOfWeek: DayOfWeek.THURSDAY,
      meetingTime: '2:00 PM',
    },
  })
  console.log('✅ Created sample formation request')

  // Create sample support ticket
  await prisma.supportTicket.create({
    data: {
      referenceNumber: 'ST-' + Date.now(),
      subject: 'Website Login Issue',
      description: 'I\'m having trouble logging into my leader dashboard. The password reset isn\'t working.',
      status: TicketStatus.PENDING_REVIEW,
      priority: TicketPriority.MEDIUM,
      requesterId: leader1.id,
    },
  })
  console.log('✅ Created sample support ticket')

  // Create sample resources
  await prisma.resource.createMany({
    data: [
      {
        title: 'Leading a Small Group - Best Practices',
        description: 'A comprehensive guide for new LifeLine leaders covering group dynamics, discussion facilitation, and pastoral care.',
        resourceType: ResourceType.LEADER_FAITH_FORMATION,
        websiteUrl: 'https://example.com/leader-guide',
        isActive: true,
      },
      {
        title: 'Advent Scripture Reflections',
        description: 'Four-week Bible study guide for the Advent season with daily reflections and group discussion questions.',
        resourceType: ResourceType.BIBLE_STUDY_REFLECTIONS,
        websiteUrl: 'https://example.com/advent-study',
        isActive: true,
      },
      {
        title: 'Fall 2024 Series: Faith in Daily Life',
        description: 'Six-week program exploring how to live out Catholic values in work, family, and community.',
        resourceType: ResourceType.SERIES_PROGRAMS,
        isActive: true,
      },
    ],
  })
  console.log('✅ Created sample resources')

  console.log('🎉 Database seed completed!')
  console.log('\n📧 Default login credentials:')
  console.log('Admin: admin@sainthelen.org / admin123')
  console.log('Formation Support: formation@sainthelen.org / support123')
  console.log('Leader 1: leader1@sainthelen.org / leader123')
  console.log('Leader 2: leader2@sainthelen.org / leader123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })