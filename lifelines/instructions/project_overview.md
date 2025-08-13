# LifeLines - Complete Project Overview

## Project Description
LifeLines is a church small groups management system migrating from WordPress to Next.js. It manages small group formation, member inquiries, leader resources, and administrative workflows.

## Current Data Volume
- 42 LifeLines (small groups)
- 45 Users
- 492 Inquiries
- 40 Formation Requests
- 5 Support Tickets

## User Roles & Permissions

### 1. Admin
- Full system access
- Can manage all content types
- User management
- System configuration

### 2. Formation & Support Team Member
- Manage formation requests (voting system)
- Handle support tickets
- View all inquiries
- Export data to CSV

### 3. LifeLine Leader
- Manage their own LifeLine(s)
- View/respond to member inquiries
- Access leader resources
- Update group information

## Core Functionality

### Formation Request Workflow
1. **External Form Submission** (Typeform replacement or native form)
2. **API Webhook Processing** (`/api/formation-requests/webhook`)
3. **Formation Team Review** (Approve/Pass/Object/Discuss voting)
4. **Auto-approval Logic** (48-hour timer, 2+ approvals, no objections)
5. **User Account Creation** (automatic LifeLine Leader account)
6. **Welcome Email** (HTML formatted with credentials)

### LifeLine Management
- Create/edit small groups
- Manage group details (ages, frequency, type, etc.)
- Handle member inquiries
- Upload group images via Unsplash API
- Video file management (S3 storage)

### Inquiry System
- Public interest forms
- Leader notification system
- Status tracking (undecided/joined/not_joined)
- Leader dashboard for responses

### Support Ticket System
- Help desk functionality
- Priority levels (high/medium/low)
- Status tracking (pending/in_progress/resolved)
- Reference number generation

### Resource Management
- Leader training materials
- Bible study resources
- Document/video storage

## Technical Requirements

### Database Schema
- PostgreSQL with Prisma ORM
- Maintain data relationships from WordPress
- Support for custom statuses and metadata

### Authentication
- NextAuth.js implementation
- Role-based access control
- Session management
- Password reset functionality

### File Storage
- AWS S3 for videos and documents
- Image optimization
- Unsplash API integration

### Email System
- SendGrid or similar service
- HTML email templates
- Automated notifications
- Welcome email system

### API Endpoints
- RESTful API structure
- Webhook handling
- Data export (CSV)
- External integrations

## Design Requirements

### Visual Identity
- Maintain current color scheme (#1f346d primary blue, #019e7c secondary teal)
- Libre Franklin & Libre Baskerville fonts
- Clean, professional church aesthetic
- Responsive design (mobile-first)

### UI Components
- Form elements matching current styling
- Dashboard cards and layouts
- Data tables with filtering/sorting
- Modal dialogs and alerts
- Tab interfaces

### User Experience
- Intuitive navigation
- Quick access to key functions
- Status indicators and badges
- Loading states and error handling
- Accessibility compliance

## Migration Strategy

### Data Export from WordPress
- Export all custom post types
- Preserve user accounts and roles
- Maintain file associations
- Export custom field data

### Data Import to Next.js
- Transform WordPress data structure
- Create database seeding scripts
- Validate data integrity
- Test all relationships

## Security Considerations
- CSRF protection
- Input validation and sanitization
- Role-based access control
- Secure file uploads
- Environment variable protection

## Performance Goals
- Fast page load times (<2 seconds)
- Efficient database queries
- Optimized image delivery
- Caching strategies
- SEO optimization

## Deployment Architecture
- Vercel or similar platform
- Environment-based configurations
- CI/CD pipeline setup
- Database backup strategies
- Monitoring and logging
