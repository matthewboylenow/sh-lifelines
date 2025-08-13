# API Endpoints & External Integrations

## Authentication Endpoints

### `/api/auth/[...nextauth].ts`
```typescript
// NextAuth.js configuration
// Handles login, logout, session management
// Supports credentials and OAuth providers

POST /api/auth/signin
POST /api/auth/signout
GET  /api/auth/session
GET  /api/auth/csrf
```

### `/api/auth/register.ts`
```typescript
POST /api/auth/register
Body: {
  email: string
  password: string
  displayName: string
  role?: UserRole
}
Response: {
  success: boolean
  user?: User
  error?: string
}
```

## LifeLine Management

### `/api/lifelines/index.ts`
```typescript
GET  /api/lifelines          // List all LifeLines (with filters)
POST /api/lifelines          // Create new LifeLine
Query params:
  - status?: LifeLineStatus
  - leader?: string
  - type?: GroupType
  - page?: number
  - limit?: number
```

### `/api/lifelines/[id].ts`
```typescript
GET    /api/lifelines/[id]   // Get specific LifeLine
PUT    /api/lifelines/[id]   // Update LifeLine
DELETE /api/lifelines/[id]   // Delete LifeLine
```

### `/api/lifelines/[id]/inquiries.ts`
```typescript
GET  /api/lifelines/[id]/inquiries  // Get inquiries for LifeLine
POST /api/lifelines/[id]/inquiries  // Create new inquiry

Body for POST: {
  personName: string
  personEmail?: string
  personPhone?: string
  message?: string
}
```

## Formation Request System

### `/api/formation-requests/index.ts`
```typescript
GET  /api/formation-requests     // List formation requests
POST /api/formation-requests     // Create formation request

Query params for GET:
  - status?: FormationStatus
  - page?: number
  - limit?: number

Body for POST: {
  groupLeader: string
  leaderEmail: string
  cellPhone?: string
  agesStages?: string
  groupType?: GroupType
  meetingFrequency?: MeetingFrequency
  dayOfWeek?: DayOfWeek
  meetingTime?: string
  description?: string
}
```

### `/api/formation-requests/[id].ts`
```typescript
GET /api/formation-requests/[id]     // Get specific request
PUT /api/formation-requests/[id]     // Update request status
```

### `/api/formation-requests/[id]/vote.ts`
```typescript
POST /api/formation-requests/[id]/vote
Body: {
  vote: VoteType
  comment?: string
}
```

### `/api/formation-requests/webhook.ts`
```typescript
POST /api/formation-requests/webhook
// Handles external form submissions (Typeform replacement)
Body: {
  form_response: {
    answers: Array<{
      text?: string
      email?: string
      phone_number?: string
      choice?: { label: string }
      choices?: { labels: string[] }
    }>
  }
}
```

## Inquiry Management

### `/api/inquiries/index.ts`
```typescript
GET /api/inquiries               // List inquiries
PUT /api/inquiries/[id]/status   // Update inquiry status

Body for PUT: {
  status: InquiryStatus
}
```

### `/api/inquiries/export.ts`
```typescript
GET /api/inquiries/export
Query params:
  - format: 'csv' | 'json'
  - lifeline?: string
  - status?: InquiryStatus
Response: File download or JSON
```

## Support Ticket System

### `/api/support-tickets/index.ts`
```typescript
GET  /api/support-tickets        // List tickets
POST /api/support-tickets        // Create ticket

Body for POST: {
  subject: string
  description: string
  priority?: TicketPriority
  ticketType?: string
}
```

### `/api/support-tickets/[id].ts`
```typescript
GET /api/support-tickets/[id]    // Get ticket details
PUT /api/support-tickets/[id]    // Update ticket status
```

### `/api/support-tickets/[id]/responses.ts`
```typescript
GET  /api/support-tickets/[id]/responses  // Get responses
POST /api/support-tickets/[id]/responses  // Add response

Body for POST: {
  content: string
  isFromSupport?: boolean
}
```

## User Management

### `/api/users/index.ts`
```typescript
GET /api/users                   // List users (admin only)
Query params:
  - role?: UserRole
  - search?: string
  - page?: number
```

### `/api/users/[id].ts`
```typescript
GET /api/users/[id]              // Get user details
PUT /api/users/[id]              // Update user
DELETE /api/users/[id]           // Delete user (admin only)
```

### `/api/users/profile.ts`
```typescript
GET /api/users/profile           // Get current user profile
PUT /api/users/profile           // Update current user profile
```

## Resource Management

### `/api/resources/index.ts`
```typescript
GET  /api/resources              // List resources
POST /api/resources              // Create resource (admin only)

Query params for GET:
  - type?: ResourceType
  - search?: string

Body for POST: {
  title: string
  description?: string
  websiteUrl?: string
  resourceType: ResourceType
  fileUrl?: string
}
```

## File Upload & Management

### `/api/upload/image.ts`
```typescript
POST /api/upload/image
Content-Type: multipart/form-data
Body: FormData with file
Response: {
  url: string
  fileName: string
  fileSize: number
}
```

### `/api/upload/video.ts`
```typescript
POST /api/upload/video
Content-Type: multipart/form-data
Response: {
  url: string
  fileName: string
  fileSize: number
}
```

## External API Integrations

### Unsplash API Integration

#### `/api/unsplash/search.ts`
```typescript
GET /api/unsplash/search
Query params:
  - query: string
  - page?: number
  - per_page?: number (max 30)

Response: {
  results: Array<{
    id: string
    urls: {
      small: string
      regular: string
      full: string
    }
    alt_description: string
    user: {
      name: string
    }
    links: {
      download_location: string
    }
  }>
  total: number
  total_pages: number
}
```

#### `/api/unsplash/download.ts`
```typescript
POST /api/unsplash/download
Body: {
  imageId: string
  downloadLocation: string
}
// Triggers download tracking for Unsplash attribution
```

### Email Service Integration

#### `/api/email/send.ts`
```typescript
POST /api/email/send
Body: {
  to: string | string[]
  subject: string
  html: string
  template?: string
  templateData?: Record<string, any>
}
```

#### Email Templates
- Welcome email for new LifeLine leaders
- Formation request notifications
- Inquiry notifications
- Support ticket updates

## Data Export Endpoints

### `/api/export/lifelines.ts`
```typescript
GET /api/export/lifelines
Query params:
  - format: 'csv' | 'json'
  - status?: LifeLineStatus
Response: File download
```

### `/api/export/formation-requests.ts`
```typescript
GET /api/export/formation-requests
Query params:
  - format: 'csv' | 'json'
  - status?: FormationStatus
Response: File download
```

## Webhook Endpoints

### `/api/webhooks/typeform.ts`
```typescript
POST /api/webhooks/typeform
// Alternative webhook for Typeform if using external forms
Headers: {
  'Typeform-Signature': string
}
```

### `/api/webhooks/email-status.ts`
```typescript
POST /api/webhooks/email-status
// Email delivery status updates from SendGrid/email service
```

## Cron/Scheduled Tasks

### `/api/cron/auto-approve.ts`
```typescript
GET /api/cron/auto-approve
// Checks for formation requests ready for auto-approval
// Runs every hour via Vercel Cron or similar
```

### `/api/cron/cleanup.ts`
```typescript
GET /api/cron/cleanup
// Cleans up expired sessions, temporary files, etc.
// Runs daily
```

## Error Handling

### Standard Error Response Format
```typescript
{
  error: string
  message: string
  statusCode: number
  timestamp: string
  path: string
}
```

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Internal Server Error

## Rate Limiting
- General API: 100 requests/minute per user
- Upload endpoints: 10 requests/minute per user
- Public endpoints: 50 requests/minute per IP

## Authentication & Authorization

### JWT Token Structure
```typescript
{
  sub: string        // User ID
  email: string
  role: UserRole
  iat: number
  exp: number
}
```

### Role-based Permissions
- **ADMIN**: All endpoints
- **FORMATION_SUPPORT_TEAM**: Formation requests, support tickets, inquiries
- **LIFELINE_LEADER**: Own LifeLines, own inquiries
- **MEMBER**: Public endpoints only

## API Documentation
- OpenAPI/Swagger documentation available at `/api/docs`
- Postman collection for testing
- Rate limits and authentication documented
- Example requests and responses for all endpoints
