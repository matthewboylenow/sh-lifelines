# LifeLines - Church Small Groups Management System

A modern Next.js application for managing church small groups, replacing the previous WordPress implementation.

## Features

- **LifeLine Management**: Create, edit, and manage small groups
- **Formation Request Workflow**: Voting system for new group approvals
- **Inquiry System**: Track member interest and responses
- **Support Ticket System**: Help desk functionality
- **Role-Based Access Control**: Admin, Formation Support, Leaders, Members
- **Dashboard Views**: Customized dashboards for different user roles
- **Unsplash Integration**: Beautiful images for groups
- **Email Notifications**: Automated communication system

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT sessions
- **File Storage**: AWS S3 integration
- **Email**: SendGrid integration
- **UI Components**: Radix UI primitives

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd lifelines
npm install
```

### 2. Database Setup

**Option A: Docker (Recommended for Development)**
```bash
# Start PostgreSQL with Docker
docker-compose up -d
```

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb lifelines_db
sudo -u postgres createuser --createdb --pwprompt lifelines_user
```

**Option C: Cloud Database (Production)**
- **Supabase**: Free PostgreSQL with 500MB
- **Railway**: PostgreSQL starting at $5/month  
- **Neon**: Serverless PostgreSQL with generous free tier

### 3. Environment Setup

Copy the environment template:
```bash
cp .env.example .env.local
```

Update `.env.local` with your configuration:

```env
# Required
DATABASE_URL="postgresql://lifelines_user:lifelines_password@localhost:5432/lifelines_db"
NEXTAUTH_SECRET="your-secure-secret-key"

# Optional (for full functionality)
UNSPLASH_ACCESS_KEY="your-unsplash-key"
ELASTIC_EMAIL_USERNAME="your-elastic-email-username"
ELASTIC_EMAIL_PASSWORD="your-elastic-email-api-key"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_S3_BUCKET_NAME="your-bucket"
```

### 4. Database Migration

Generate Prisma client and push schema:
```bash
npm run db:generate
npm run db:push
```

Seed the database with sample data:
```bash
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Default Users (Development)

After seeding, you can login with these accounts:

- **Admin**: admin@sainthelen.org / admin123
- **Formation Support**: support@sainthelen.org / support123
- **Leader**: maria.fusillo@example.com / leader123

## Project Structure

```
lifelines/
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # Reusable React components
│   │   ├── auth/           # Authentication components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── layout/         # Layout components
│   │   ├── lifelines/      # LifeLine-specific components
│   │   └── ui/             # Basic UI components
│   ├── lib/                # Utility libraries
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Helper functions
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets
└── instructions/          # Project documentation
```

## Key Pages

- **Homepage** (`/`): Public LifeLines listing with filters
- **Login** (`/login`): Authentication page
- **Leader Dashboard** (`/dashboard/leader`): LifeLine management
- **Formation Dashboard** (`/dashboard/formation-support`): Request approvals
- **Admin Dashboard** (`/dashboard/admin`): System administration

## API Endpoints

- `GET /api/lifelines` - List LifeLines with filtering
- `POST /api/lifelines` - Create new LifeLine
- `GET /api/lifelines/[id]` - Get specific LifeLine
- `PUT /api/lifelines/[id]` - Update LifeLine
- `DELETE /api/lifelines/[id]` - Delete LifeLine

See `src/app/api/` for complete API documentation.

## Customization

### Brand Colors

The application uses Saint Helen Church's brand colors defined in `tailwind.config.ts`:

- **Primary Blue**: `#1f346d`
- **Secondary Teal**: `#019e7c`
- **Background**: `#f3f4f6`

### Typography

- **Primary Font**: Libre Franklin
- **Secondary Font**: Libre Baskerville (for headings)

### Layout Components

- Header with navigation and user menu
- Footer with church branding
- Responsive design for mobile/desktop

## Database Schema

Key models:
- **User**: Authentication and role management
- **LifeLine**: Small group information
- **FormationRequest**: New group proposals with voting
- **Inquiry**: Member interest tracking
- **SupportTicket**: Help desk system
- **Resource**: Leader and member resources

## Deployment

### Environment Variables

For production, ensure these are configured:

```env
DATABASE_URL="your-production-db-url"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="secure-production-secret"
```

### Build Commands

```bash
npm run build
npm start
```

### Database Migration

```bash
npm run db:migrate
```

## Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:migrate      # Create and run migrations
npm run db:seed         # Seed database with sample data

# Code Quality
npm run lint            # ESLint check
npm run type-check      # TypeScript check
```

## Migration from WordPress

This application replaces a WordPress LifeLines system. Key improvements:

1. **Modern Tech Stack**: Next.js vs WordPress
2. **Better Performance**: Server-side rendering and optimization
3. **Enhanced UX**: Custom-built dashboards and workflows
4. **Type Safety**: Full TypeScript implementation
5. **API-First**: RESTful API design
6. **Scalability**: Built for growth and maintenance

## Support

For questions or issues:
- Check the `instructions/` folder for detailed documentation
- Review API endpoints in `src/app/api/`
- Contact: admin@sainthelen.org

## License

Copyright 2024 Saint Helen Church, Westfield, New Jersey