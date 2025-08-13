# Database Schema Definition

## Prisma Schema Structure

### User Management
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  username      String?   @unique
  password      String
  displayName   String?
  role          UserRole  @default(MEMBER)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relationships
  ledLifeLines        LifeLine[]        @relation("LifeLineLeader")
  formationRequests   FormationRequest[]
  inquiries          Inquiry[]
  supportTickets     SupportTicket[]
  votes              FormationVote[]
  
  @@map("users")
}

enum UserRole {
  ADMIN
  FORMATION_SUPPORT_TEAM
  LIFELINE_LEADER
  MEMBER
}
```

### LifeLine (Small Groups)
```prisma
model LifeLine {
  id                  String    @id @default(cuid())
  title               String
  description         String?   @db.Text
  status              LifeLineStatus @default(DRAFT)
  
  // Group Details
  groupLeader         String
  leaderEmail         String
  agesStages          String[]  // Array of selected options
  meetingFrequency    MeetingFrequency?
  dayOfWeek           DayOfWeek?
  groupType           GroupType?
  meetingTime         String?
  
  // Media
  imageUrl            String?
  imageAlt            String?
  videoUrl            String?
  
  // Timestamps
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  // Relationships
  leaderId            String
  leader              User      @relation("LifeLineLeader", fields: [leaderId], references: [id])
  inquiries           Inquiry[]
  formationRequest    FormationRequest? @relation("CreatedLifeLine")
  
  @@map("lifelines")
}

enum LifeLineStatus {
  DRAFT
  PUBLISHED
  FULL
  ARCHIVED
}

enum MeetingFrequency {
  WEEKLY
  MONTHLY
  SEASONALLY
}

enum DayOfWeek {
  SUNDAY
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  VARIES
}

enum GroupType {
  SOCIAL
  ACTIVITY
  SCRIPTURE_BASED
  SUNDAY_BASED
}
```

### Formation Request System
```prisma
model FormationRequest {
  id                  String    @id @default(cuid())
  title               String
  description         String?   @db.Text
  status              FormationStatus @default(SUBMITTED)
  
  // Form Data from Typeform/Native Form
  groupLeader         String
  leaderEmail         String
  cellPhone           String?
  agesStages          String?
  groupType           GroupType?
  meetingFrequency    MeetingFrequency?
  dayOfWeek           DayOfWeek?
  meetingTime         String?
  
  // System Fields
  autoApprovalScheduled DateTime?
  lifeLineCreated     Boolean   @default(false)
  
  // Timestamps
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  // Relationships
  submitterId         String?
  submitter           User?     @relation(fields: [submitterId], references: [id])
  votes               FormationVote[]
  comments            FormationComment[]
  createdLifeLine     LifeLine? @relation("CreatedLifeLine")
  
  @@map("formation_requests")
}

enum FormationStatus {
  SUBMITTED
  APPROVED
  REJECTED
  ARCHIVED
}

model FormationVote {
  id          String      @id @default(cuid())
  vote        VoteType
  comment     String?     @db.Text
  createdAt   DateTime    @default(now())
  
  // Relationships
  requestId   String
  request     FormationRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  
  @@unique([requestId, userId]) // One vote per user per request
  @@map("formation_votes")
}

enum VoteType {
  APPROVE
  PASS
  OBJECT
  DISCUSS
}

model FormationComment {
  id          String    @id @default(cuid())
  content     String    @db.Text
  createdAt   DateTime  @default(now())
  
  // Relationships
  requestId   String
  request     FormationRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  
  @@map("formation_comments")
}
```

### Inquiry System
```prisma
model Inquiry {
  id              String        @id @default(cuid())
  personName      String
  personEmail     String?
  personPhone     String?
  message         String?       @db.Text
  status          InquiryStatus @default(UNDECIDED)
  
  // Timestamps
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  // Relationships
  lifeLineId      String
  lifeLine        LifeLine      @relation(fields: [lifeLineId], references: [id])
  
  @@map("inquiries")
}

enum InquiryStatus {
  UNDECIDED
  JOINED
  NOT_JOINED
}
```

### Support Ticket System
```prisma
model SupportTicket {
  id              String        @id @default(cuid())
  referenceNumber String        @unique
  subject         String
  description     String        @db.Text
  status          TicketStatus  @default(PENDING_REVIEW)
  priority        TicketPriority @default(MEDIUM)
  ticketType      String?
  
  // Timestamps
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  resolvedAt      DateTime?
  
  // Relationships
  requesterId     String
  requester       User          @relation(fields: [requesterId], references: [id])
  responses       TicketResponse[]
  
  @@map("support_tickets")
}

enum TicketStatus {
  PENDING_REVIEW
  IN_PROGRESS
  RESOLVED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
}

model TicketResponse {
  id            String        @id @default(cuid())
  content       String        @db.Text
  isFromSupport Boolean       @default(false)
  createdAt     DateTime      @default(now())
  
  // Relationships
  ticketId      String
  ticket        SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId      String
  author        User          @relation(fields: [authorId], references: [id])
  
  @@map("ticket_responses")
}
```

### Resource Management
```prisma
model Resource {
  id            String        @id @default(cuid())
  title         String
  description   String?       @db.Text
  websiteUrl    String?
  resourceType  ResourceType
  isActive      Boolean       @default(true)
  
  // File Management
  fileUrl       String?
  fileName      String?
  fileSize      Int?
  
  // Timestamps
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  @@map("resources")
}

enum ResourceType {
  BIBLE_STUDY_REFLECTIONS
  SERIES_PROGRAMS
  LEADER_FAITH_FORMATION
}
```

## Key Migration Notes

### WordPress to Next.js Mapping
- `post_type: 'lifelines'` → `LifeLine` model
- `post_type: 'lifeline_inquiry'` → `Inquiry` model
- `post_type: 'formation_request'` → `FormationRequest` model
- `post_type: 'support_ticket'` → `SupportTicket` model
- `post_type: 'resources'` → `Resource` model

### ACF Field Mapping
- `ages_&_stages` → `agesStages` (String array)
- `meeting_frequency` → `meetingFrequency` (Enum)
- `day_of_the_week` → `dayOfWeek` (Enum)
- `group_leader` → `groupLeader` (String)
- `leader_email_address` → `leaderEmail` (String)

### Custom Status Handling
- WordPress post status → Enum values
- Maintain status transition logic
- Preserve auto-approval functionality

## Seeding Strategy
1. Export WordPress data to JSON
2. Create seed scripts for each model
3. Handle user password migration (require reset)
4. Preserve relationships and foreign keys
5. Validate data integrity post-migration
