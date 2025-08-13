# LifeLines - Church Small Groups Management System

A modern, full-stack web application for managing church small groups (LifeLines) with formation requests, member inquiries, and administrative workflows.

## 🌟 Features

### Core Functionality
- **LifeLine Management** - Create, edit, and manage small groups
- **Formation Requests** - Automated approval workflow with voting system
- **Member Inquiries** - Handle interest forms with leader notifications
- **Support Tickets** - Help desk system with priority tracking
- **User Management** - Role-based access control (Admin, Formation Team, Leaders)

### Advanced Features
- **Email System** - SendGrid integration with HTML templates
- **File Uploads** - AWS S3 integration for documents and media
- **Image Search** - Unsplash API integration for group images
- **WordPress Migration** - Complete data migration from WordPress
- **Auto-Approval** - Cron-job based formation request processing
- **Responsive Design** - Mobile-first UI with Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- SendGrid account (for emails)
- AWS S3 bucket (optional, for file uploads)
- Unsplash API key (optional, for images)

### 1. Clone and Install
```bash
git clone <repository-url>
cd lifelines
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/lifelines"
NEXTAUTH_SECRET="your-nextauth-secret-here"
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="noreply@yourdomain.com"
APP_URL="http://localhost:3000"
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 4. Start Development
```bash
npm run dev
```

Visit `http://localhost:3000` and login with:
- **Admin**: admin@sainthelen.org / admin123
- **Formation Team**: formation@sainthelen.org / support123
- **Leader**: leader1@sainthelen.org / leader123

## 📦 Production Deployment

### Vercel (Recommended)

1. **Connect Repository**
   - Import your repository to Vercel
   - Set framework preset to "Next.js"

2. **Environment Variables**
   Set these in Vercel dashboard:
   ```
   DATABASE_URL
   NEXTAUTH_SECRET
   NEXTAUTH_URL
   SENDGRID_API_KEY
   FROM_EMAIL
   ADMIN_EMAIL
   AWS_ACCESS_KEY_ID (optional)
   AWS_SECRET_ACCESS_KEY (optional)
   AWS_S3_BUCKET (optional)
   UNSPLASH_ACCESS_KEY (optional)
   CRON_SECRET
   ```

3. **Database Setup**
   ```bash
   # Run migrations on production database
   npm run db:migrate
   
   # Seed production data (optional)
   npm run db:seed
   ```

4. **Cron Jobs**
   - Formation processing runs every 6 hours automatically
   - Monitor via `/api/cron/process-formations` endpoint

## 🔧 Configuration

### Email Templates
Customize email templates in `src/lib/email.ts`:
- Welcome emails for new leaders
- Formation request notifications  
- Inquiry notifications
- Password reset emails

### Formation Workflow
Configure auto-approval criteria in `src/lib/formation-workflow.ts`:
- Minimum approval votes (default: 2)
- Review period (default: 24 hours)
- Voting thresholds

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/reset-password` - Password reset

### LifeLines
- `GET /api/lifelines` - List all LifeLines
- `POST /api/lifelines` - Create LifeLine
- `GET /api/lifelines/[id]` - Get specific LifeLine
- `PUT /api/lifelines/[id]` - Update LifeLine

### Formation Requests
- `GET /api/formation-requests` - List formation requests
- `POST /api/formation-requests` - Create formation request
- `POST /api/formation-requests/[id]/vote` - Vote on request

### Inquiries
- `GET /api/inquiries` - List inquiries
- `POST /api/inquiries` - Create inquiry
- `PUT /api/inquiries/[id]` - Update inquiry status

### Support Tickets
- `GET /api/support-tickets` - List support tickets
- `POST /api/support-tickets` - Create support ticket
- `POST /api/support-tickets/[id]/responses` - Add response

### File Management
- `POST /api/upload` - Upload files to S3
- `POST /api/unsplash/search` - Search Unsplash images
- `POST /api/unsplash/download` - Track image download

### Migration
- `POST /api/migration/wordpress/users` - Import WordPress users
- `POST /api/migration/wordpress/lifelines` - Import WordPress LifeLines
- `POST /api/migration/wordpress/inquiries` - Import WordPress inquiries

### Cron Jobs
- `POST /api/cron/process-formations` - Process pending formation requests
- `GET /api/cron/process-formations` - Get formation status

## 🔒 Security Features

- **Role-based Access Control** - Granular permissions per user type
- **Input Validation** - Zod schema validation on all endpoints
- **CSRF Protection** - Built-in Next.js CSRF protection
- **SQL Injection Prevention** - Prisma ORM with parameterized queries
- **XSS Prevention** - Input sanitization and output encoding
- **Secure Headers** - Security headers configured in Vercel
- **File Upload Security** - Type and size validation, S3 integration

## 📝 WordPress Migration

### Export Data
1. Export WordPress database
2. Use provided scripts to convert data:
   ```bash
   node scripts/migrate-from-wordpress.js
   ```

### Migration Process
1. **Users**: Import with role mapping
2. **LifeLines**: Convert custom post types
3. **Inquiries**: Migrate contact forms
4. **Media**: Transfer to S3 (optional)

## 📚 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Radix UI** - Headless UI components
- **React Hook Form** - Form handling

### Backend
- **Next.js API Routes** - Serverless functions
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **NextAuth.js** - Authentication
- **Zod** - Schema validation

### External Services
- **SendGrid** - Email delivery
- **AWS S3** - File storage
- **Unsplash** - Stock images
- **Vercel** - Hosting platform

---

Built with ❤️ for Saint Helen Church, Westfield, New Jersey