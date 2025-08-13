import { 
  User, 
  LifeLine, 
  FormationRequest, 
  Inquiry, 
  SupportTicket, 
  Resource,
  FormationVote,
  FormationComment,
  TicketResponse,
  UserRole,
  LifeLineStatus,
  FormationStatus,
  InquiryStatus,
  TicketStatus,
  TicketPriority,
  VoteType,
  MeetingFrequency,
  DayOfWeek,
  GroupType,
  ResourceType
} from '@prisma/client'

export type {
  User,
  LifeLine,
  FormationRequest,
  Inquiry,
  SupportTicket,
  Resource,
  FormationVote,
  FormationComment,
  TicketResponse,
  UserRole,
  LifeLineStatus,
  FormationStatus,
  InquiryStatus,
  TicketStatus,
  TicketPriority,
  VoteType,
  MeetingFrequency,
  DayOfWeek,
  GroupType,
  ResourceType
}

// Extended types with relations
export type UserWithRelations = User & {
  ledLifeLines?: LifeLine[]
  formationRequests?: FormationRequest[]
  inquiries?: Inquiry[]
  supportTickets?: SupportTicket[]
}

export type LifeLineWithLeader = LifeLine & {
  leader: User
  inquiries?: Inquiry[]
  _count?: {
    inquiries: number
  }
}

export type FormationRequestWithDetails = FormationRequest & {
  submitter?: User
  votes?: (FormationVote & { user: User })[]
  comments?: (FormationComment & { author: User })[]
  createdLifeLine?: LifeLine
}

export type InquiryWithLifeLine = Inquiry & {
  lifeLine: LifeLine & { leader: User }
}

export type SupportTicketWithDetails = SupportTicket & {
  requester: User
  responses?: (TicketResponse & { author: User })[]
}

// Form types
export type CreateLifeLineForm = {
  title: string
  description?: string
  agesStages: string[]
  meetingFrequency?: MeetingFrequency
  dayOfWeek?: DayOfWeek
  groupType?: GroupType
  meetingTime?: string
  imageUrl?: string
  imageAlt?: string
  imageAttribution?: string
  videoUrl?: string
}

export type CreateFormationRequestForm = {
  title: string
  description?: string
  groupLeader: string
  leaderEmail: string
  cellPhone?: string
  agesStages?: string
  groupType?: GroupType
  meetingFrequency?: MeetingFrequency
  dayOfWeek?: DayOfWeek
  meetingTime?: string
}

export type CreateInquiryForm = {
  personName: string
  personEmail?: string
  personPhone?: string
  message?: string
  lifeLineId: string
}

export type CreateSupportTicketForm = {
  subject: string
  description: string
  priority?: TicketPriority
  ticketType?: string
}

// API Response types
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Dashboard types
export type DashboardStats = {
  totalLifeLines: number
  totalInquiries: number
  totalFormationRequests: number
  totalSupportTickets: number
  pendingFormationRequests: number
  openSupportTickets: number
  recentActivity: DashboardActivity[]
}

export type DashboardActivity = {
  id: string
  type: 'lifeline' | 'inquiry' | 'formation' | 'support'
  title: string
  description: string
  timestamp: Date
  userId?: string
  userName?: string
}

// Unsplash types
export type UnsplashImage = {
  id: string
  urls: {
    small: string
    regular: string
    full: string
  }
  alt_description: string | null
  user: {
    name: string
    username: string
  }
  links: {
    download_location: string
  }
}

export type UnsplashSearchResponse = {
  images: UnsplashImage[]
  total: number
  total_pages: number
  page: number
}