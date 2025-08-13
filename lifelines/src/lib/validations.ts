import { z } from 'zod'
import { UserRole, GroupType, MeetingFrequency, DayOfWeek, TicketPriority, ResourceType } from '@prisma/client'

// User validations
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').optional(),
  role: z.nativeEnum(UserRole).optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const updateProfileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
})

// LifeLine validations
export const createLifeLineSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  agesStages: z.array(z.string()).min(1, 'At least one age/stage must be selected'),
  meetingFrequency: z.nativeEnum(MeetingFrequency).optional(),
  dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
  groupType: z.nativeEnum(GroupType).optional(),
  meetingTime: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  imageAlt: z.string().optional(),
  imageAttribution: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
})

export const updateLifeLineSchema = createLifeLineSchema.partial()

// Formation Request validations
export const createFormationRequestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  groupLeader: z.string().min(2, 'Group leader name is required'),
  leaderEmail: z.string().email('Invalid email address'),
  cellPhone: z.string().optional(),
  agesStages: z.string().optional(),
  groupType: z.nativeEnum(GroupType).optional(),
  meetingFrequency: z.nativeEnum(MeetingFrequency).optional(),
  dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
  meetingTime: z.string().optional(),
})

export const voteOnFormationRequestSchema = z.object({
  vote: z.enum(['APPROVE', 'PASS', 'OBJECT', 'DISCUSS']),
  comment: z.string().optional(),
})

export const commentOnFormationRequestSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
})

// Inquiry validations
export const createInquirySchema = z.object({
  personName: z.string().min(2, 'Name must be at least 2 characters'),
  personEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  personPhone: z.string().optional(),
  message: z.string().optional(),
  lifeLineId: z.string().cuid('Invalid LifeLine ID'),
})

export const updateInquiryStatusSchema = z.object({
  status: z.enum(['UNDECIDED', 'JOINED', 'NOT_JOINED']),
})

// Support Ticket validations
export const createSupportTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.nativeEnum(TicketPriority).optional(),
  ticketType: z.string().optional(),
})

export const updateSupportTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  status: z.enum(['PENDING_REVIEW', 'IN_PROGRESS', 'RESOLVED']).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  ticketType: z.string().optional(),
})

export const createSupportTicketResponseSchema = z.object({
  content: z.string().min(1, 'Response cannot be empty'),
  isFromSupport: z.boolean().optional(),
})

// Resource validations
export const createResourceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  resourceType: z.nativeEnum(ResourceType),
  fileUrl: z.string().url().optional().or(z.literal('')),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
})

export const updateResourceSchema = createResourceSchema.partial()

// Search and filter validations
export const lifeLineFiltersSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'FULL', 'ARCHIVED']).optional(),
  groupType: z.nativeEnum(GroupType).optional(),
  meetingFrequency: z.nativeEnum(MeetingFrequency).optional(),
  dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
  agesStages: z.array(z.string()).optional(),
  search: z.string().optional(),
  leaderId: z.string().cuid().optional(),
})

export const formationRequestFiltersSchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED']).optional(),
  groupType: z.nativeEnum(GroupType).optional(),
  search: z.string().optional(),
})

export const inquiryFiltersSchema = z.object({
  status: z.enum(['UNDECIDED', 'JOINED', 'NOT_JOINED']).optional(),
  lifeLineId: z.string().cuid().optional(),
  search: z.string().optional(),
})

export const supportTicketFiltersSchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'IN_PROGRESS', 'RESOLVED']).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  search: z.string().optional(),
  requesterId: z.string().cuid().optional(),
})

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
})

// File upload validation
export const uploadImageSchema = z.object({
  file: z.object({
    name: z.string(),
    type: z.string().refine(type => type.startsWith('image/'), 'File must be an image'),
    size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
  }),
})

// Unsplash integration
export const unsplashSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(30).default(12),
})

export const unsplashDownloadSchema = z.object({
  downloadLocation: z.string().url('Invalid download location'),
})