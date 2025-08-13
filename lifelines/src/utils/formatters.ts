import { GroupType, MeetingFrequency, DayOfWeek, UserRole, LifeLineStatus, FormationStatus, InquiryStatus, TicketStatus, TicketPriority, VoteType } from '@prisma/client'

export function formatGroupType(type: GroupType): string {
  const typeMap = {
    [GroupType.SOCIAL]: 'Social',
    [GroupType.ACTIVITY]: 'Activity',
    [GroupType.SCRIPTURE_BASED]: 'Scripture Based',
    [GroupType.SUNDAY_BASED]: 'Sunday Based',
  }
  return typeMap[type] || type
}

export function formatMeetingFrequency(frequency: MeetingFrequency): string {
  const frequencyMap = {
    [MeetingFrequency.WEEKLY]: 'Weekly',
    [MeetingFrequency.MONTHLY]: 'Monthly',
    [MeetingFrequency.SEASONALLY]: 'Seasonally',
  }
  return frequencyMap[frequency] || frequency
}

export function formatDayOfWeek(day: DayOfWeek): string {
  const dayMap = {
    [DayOfWeek.SUNDAY]: 'Sunday',
    [DayOfWeek.MONDAY]: 'Monday',
    [DayOfWeek.TUESDAY]: 'Tuesday',
    [DayOfWeek.WEDNESDAY]: 'Wednesday',
    [DayOfWeek.THURSDAY]: 'Thursday',
    [DayOfWeek.FRIDAY]: 'Friday',
    [DayOfWeek.SATURDAY]: 'Saturday',
    [DayOfWeek.VARIES]: 'Varies',
  }
  return dayMap[day] || day
}

export function formatUserRole(role: UserRole): string {
  const roleMap = {
    [UserRole.ADMIN]: 'Administrator',
    [UserRole.FORMATION_SUPPORT_TEAM]: 'Formation & Support Team',
    [UserRole.LIFELINE_LEADER]: 'LifeLine Leader',
    [UserRole.MEMBER]: 'Member',
  }
  return roleMap[role] || role
}

export function formatLifeLineStatus(status: LifeLineStatus): string {
  const statusMap = {
    [LifeLineStatus.DRAFT]: 'Draft',
    [LifeLineStatus.PUBLISHED]: 'Published',
    [LifeLineStatus.FULL]: 'Full',
    [LifeLineStatus.ARCHIVED]: 'Archived',
  }
  return statusMap[status] || status
}

export function formatFormationStatus(status: FormationStatus): string {
  const statusMap = {
    [FormationStatus.SUBMITTED]: 'Submitted',
    [FormationStatus.APPROVED]: 'Approved',
    [FormationStatus.REJECTED]: 'Rejected',
    [FormationStatus.ARCHIVED]: 'Archived',
  }
  return statusMap[status] || status
}

export function formatInquiryStatus(status: InquiryStatus): string {
  const statusMap = {
    [InquiryStatus.UNDECIDED]: 'Undecided',
    [InquiryStatus.JOINED]: 'Joined',
    [InquiryStatus.NOT_JOINED]: 'Not Joined',
  }
  return statusMap[status] || status
}

export function formatTicketStatus(status: TicketStatus): string {
  const statusMap = {
    [TicketStatus.PENDING_REVIEW]: 'Pending Review',
    [TicketStatus.IN_PROGRESS]: 'In Progress',
    [TicketStatus.RESOLVED]: 'Resolved',
  }
  return statusMap[status] || status
}

export function formatTicketPriority(priority: TicketPriority): string {
  const priorityMap = {
    [TicketPriority.LOW]: 'Low',
    [TicketPriority.MEDIUM]: 'Medium',
    [TicketPriority.HIGH]: 'High',
  }
  return priorityMap[priority] || priority
}

export function formatVoteType(vote: VoteType): string {
  const voteMap = {
    [VoteType.APPROVE]: 'Approve',
    [VoteType.PASS]: 'Pass',
    [VoteType.OBJECT]: 'Object',
    [VoteType.DISCUSS]: 'Discuss',
  }
  return voteMap[vote] || vote
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  const minute = 60 * 1000
  const hour = minute * 60
  const day = hour * 24
  const week = day * 7
  const month = day * 30
  const year = day * 365

  if (diff < minute) {
    return 'just now'
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diff < day) {
    const hours = Math.floor(diff / hour)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diff < week) {
    const days = Math.floor(diff / day)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else if (diff < month) {
    const weeks = Math.floor(diff / week)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  } else if (diff < year) {
    const months = Math.floor(diff / month)
    return `${months} month${months > 1 ? 's' : ''} ago`
  } else {
    const years = Math.floor(diff / year)
    return `${years} year${years > 1 ? 's' : ''} ago`
  }
}

export function generateReferenceNumber(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `SH-${timestamp}-${random}`
}