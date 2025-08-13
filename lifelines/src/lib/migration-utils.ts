// WordPress Migration Utilities

export interface WordPressUser {
  user_login: string
  user_email: string
  display_name?: string
  user_registered?: string
  meta?: Record<string, any>
  roles?: string[]
}

export interface WordPressLifeLine {
  ID: number
  post_title: string
  post_content?: string
  post_status: string
  post_date: string
  meta?: Record<string, any>
  leader_email?: string
  group_leader?: string
}

export interface WordPressInquiry {
  ID: number
  person_name: string
  person_email?: string
  person_phone?: string
  message?: string
  lifeline_id?: number
  lifeline_title?: string
  status?: string
  date_created: string
  meta?: Record<string, any>
}

export interface MigrationResult {
  imported: number
  skipped: number
  errors: number
  details: Array<{
    identifier: string
    status: 'imported' | 'skipped' | 'error'
    message: string
  }>
}

// Export WordPress data from database
export async function exportWordPressUsers(): Promise<WordPressUser[]> {
  // This would typically connect to WordPress MySQL database
  // For now, return example structure for documentation
  return [
    {
      user_login: 'john.doe',
      user_email: 'john.doe@example.com',
      display_name: 'John Doe',
      user_registered: '2023-01-01 00:00:00',
      roles: ['lifeline_leader'],
      meta: {
        phone: '555-123-4567',
        bio: 'Experienced small group leader'
      }
    }
  ]
}

// Helper function to validate WordPress export data
export function validateWordPressUsers(users: any[]): string[] {
  const errors: string[] = []
  
  users.forEach((user, index) => {
    if (!user.user_email) {
      errors.push(`User at index ${index}: Missing email`)
    }
    if (!user.user_login) {
      errors.push(`User at index ${index}: Missing username`)
    }
    if (user.user_email && !isValidEmail(user.user_email)) {
      errors.push(`User at index ${index}: Invalid email format`)
    }
  })
  
  return errors
}

export function validateWordPressLifeLines(lifelines: any[]): string[] {
  const errors: string[] = []
  
  lifelines.forEach((lifeline, index) => {
    if (!lifeline.post_title) {
      errors.push(`LifeLine at index ${index}: Missing title`)
    }
    if (!lifeline.post_date) {
      errors.push(`LifeLine at index ${index}: Missing date`)
    }
  })
  
  return errors
}

export function validateWordPressInquiries(inquiries: any[]): string[] {
  const errors: string[] = []
  
  inquiries.forEach((inquiry, index) => {
    if (!inquiry.person_name) {
      errors.push(`Inquiry at index ${index}: Missing person name`)
    }
    if (!inquiry.date_created) {
      errors.push(`Inquiry at index ${index}: Missing creation date`)
    }
    if (inquiry.person_email && !isValidEmail(inquiry.person_email)) {
      errors.push(`Inquiry at index ${index}: Invalid email format`)
    }
  })
  
  return errors
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Migration workflow helpers
export async function migrateUsers(users: WordPressUser[]): Promise<MigrationResult> {
  const response = await fetch('/api/migration/wordpress/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users })
  })

  if (!response.ok) {
    throw new Error('Failed to migrate users')
  }

  const result = await response.json()
  return result.data
}

export async function migrateLifeLines(lifelines: WordPressLifeLine[]): Promise<MigrationResult> {
  const response = await fetch('/api/migration/wordpress/lifelines', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lifelines })
  })

  if (!response.ok) {
    throw new Error('Failed to migrate LifeLines')
  }

  const result = await response.json()
  return result.data
}

export async function migrateInquiries(inquiries: WordPressInquiry[]): Promise<MigrationResult> {
  const response = await fetch('/api/migration/wordpress/inquiries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inquiries })
  })

  if (!response.ok) {
    throw new Error('Failed to migrate inquiries')
  }

  const result = await response.json()
  return result.data
}

// WordPress SQL export queries (for reference)
export const WORDPRESS_EXPORT_QUERIES = {
  users: `
    SELECT 
      u.user_login,
      u.user_email,
      u.display_name,
      u.user_registered,
      GROUP_CONCAT(DISTINCT r.meta_value) as roles,
      GROUP_CONCAT(DISTINCT CONCAT(m.meta_key, ':', m.meta_value) SEPARATOR '|') as meta
    FROM wp_users u
    LEFT JOIN wp_usermeta r ON u.ID = r.user_id AND r.meta_key = 'wp_capabilities'
    LEFT JOIN wp_usermeta m ON u.ID = m.user_id AND m.meta_key NOT IN ('wp_capabilities', 'wp_user_level')
    WHERE u.user_status = 0
    GROUP BY u.ID
    ORDER BY u.user_registered DESC
  `,
  
  lifelines: `
    SELECT 
      p.ID,
      p.post_title,
      p.post_content,
      p.post_status,
      p.post_date,
      GROUP_CONCAT(DISTINCT CONCAT(pm.meta_key, ':', pm.meta_value) SEPARATOR '|') as meta,
      leader.meta_value as leader_email,
      groupleader.meta_value as group_leader
    FROM wp_posts p
    LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
    LEFT JOIN wp_postmeta leader ON p.ID = leader.post_id AND leader.meta_key = 'leader_email'
    LEFT JOIN wp_postmeta groupleader ON p.ID = groupleader.post_id AND groupleader.meta_key = 'group_leader'
    WHERE p.post_type = 'lifeline'
    AND p.post_status IN ('publish', 'draft', 'private')
    GROUP BY p.ID
    ORDER BY p.post_date DESC
  `,
  
  inquiries: `
    SELECT 
      i.ID,
      i.person_name,
      i.person_email,
      i.person_phone,
      i.message,
      i.lifeline_id,
      l.post_title as lifeline_title,
      i.status,
      i.date_created,
      GROUP_CONCAT(DISTINCT CONCAT(im.meta_key, ':', im.meta_value) SEPARATOR '|') as meta
    FROM wp_lifeline_inquiries i
    LEFT JOIN wp_posts l ON i.lifeline_id = l.ID
    LEFT JOIN wp_lifeline_inquiry_meta im ON i.ID = im.inquiry_id
    GROUP BY i.ID
    ORDER BY i.date_created DESC
  `
}