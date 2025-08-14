# Production Deployment Guide

This guide covers deploying the LifeLines application to Vercel with a PostgreSQL database.

## Prerequisites

- Vercel account
- PostgreSQL database (Vercel Postgres, Supabase, or other)
- Domain name (optional)
- SendGrid account for emails
- Unsplash API key (optional, for image search)

## Environment Variables

### Required Variables

Copy these to your Vercel environment variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# NextAuth.js
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="your-long-random-secret-string-here"

# Email Service (SendGrid)
SENDGRID_API_KEY="SG.your-sendgrid-api-key-here"
FROM_EMAIL="noreply@your-domain.com"
FROM_NAME="Saint Helen LifeLines"

# Unsplash API (Optional)
UNSPLASH_ACCESS_KEY="your-unsplash-access-key"

# Typeform Webhook (Optional)
TYPEFORM_WEBHOOK_SECRET="your-typeform-webhook-secret"

# Admin Setup (for initial admin user creation)
ADMIN_EMAIL="admin@your-domain.com"
ADMIN_PASSWORD="secure-admin-password-here"
```

### Optional Variables

```bash
# Custom SMTP (alternative to SendGrid)
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-username"
SMTP_PASSWORD="your-smtp-password"

# Application URLs
CONTACT_EMAIL="support@your-domain.com"
ORGANIZATION_NAME="Your Church Name"
```

## Database Setup

### Option 1: Vercel Postgres
1. Go to your Vercel dashboard
2. Select your project
3. Go to Storage tab
4. Create a new Postgres database
5. Copy the connection string to `DATABASE_URL`

### Option 2: External Database
1. Set up PostgreSQL database (Supabase, Railway, etc.)
2. Copy connection string to `DATABASE_URL`
3. Ensure connection allows SSL

### Database Migration

After database setup, run migrations:

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed initial admin user (optional)
npx prisma db seed
```

## Deployment Steps

### 1. Connect GitHub Repository

1. Go to Vercel dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Select the LifeLines project

### 2. Configure Build Settings

Vercel will auto-detect Next.js, but verify:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (leave empty if repo root)
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm ci`

### 3. Add Environment Variables

In your Vercel project settings:

1. Go to "Environment Variables"
2. Add all required variables from above
3. Set for Production, Preview, and Development environments

### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Check deployment logs for errors

## Post-Deployment Setup

### 1. Database Initialization

After first deployment, initialize the database:

```bash
# Run this locally with production DATABASE_URL
DATABASE_URL="your-production-url" npx prisma db push
```

### 2. Create Admin User

Either:
- Use the seeding script with `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables
- Or register the first admin user through the `/register` page (admin-only)

### 3. Configure Email Templates

1. Log in as admin
2. Test email functionality through support tickets or password reset
3. Customize email templates if needed in `/src/lib/email.ts`

### 4. Set Up Cron Jobs

Vercel will automatically set up the cron job for formation request processing based on `vercel.json`.

### 5. Configure Typeform Webhook (Optional)

1. In Typeform, go to your form settings
2. Add webhook URL: `https://your-domain.vercel.app/api/webhooks/typeform`
3. Use the secret from `TYPEFORM_WEBHOOK_SECRET`
4. Test with a form submission

## Domain Configuration

### Custom Domain

1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `NEXTAUTH_URL` to your custom domain

### SSL Certificate

Vercel automatically provides SSL certificates for all domains.

## Monitoring and Maintenance

### Performance Monitoring

1. Use Vercel Analytics (built-in)
2. Monitor function execution times
3. Check database query performance

### Error Monitoring

1. Monitor Vercel function logs
2. Set up error alerting
3. Monitor email delivery rates

### Database Maintenance

1. Regular backups (automatic with Vercel Postgres)
2. Monitor database size and performance
3. Clean up old data periodically

## Security Checklist

- [ ] All environment variables are secure
- [ ] Database uses SSL connections
- [ ] NEXTAUTH_SECRET is long and random
- [ ] Admin passwords are strong
- [ ] Email credentials are secure
- [ ] Webhook secrets are configured
- [ ] CORS headers are properly configured

## Troubleshooting

### Build Failures

1. Check build logs in Vercel dashboard
2. Verify all dependencies are in `package.json`
3. Ensure TypeScript types are correct
4. Check for missing environment variables

### Database Connection Issues

1. Verify `DATABASE_URL` format
2. Check database server status
3. Ensure IP whitelist includes Vercel
4. Test connection locally

### Email Issues

1. Verify SendGrid API key
2. Check sender email domain authentication
3. Monitor SendGrid delivery reports
4. Test with different email providers

### Authentication Issues

1. Verify `NEXTAUTH_URL` matches deployed domain
2. Check `NEXTAUTH_SECRET` is set
3. Clear browser cookies and try again
4. Check session storage configuration

## Performance Optimization

### Database Optimization

1. Add database indexes for frequent queries
2. Use connection pooling
3. Monitor slow queries
4. Implement query caching where appropriate

### Frontend Optimization

1. Enable Vercel Edge Functions for global performance
2. Optimize images with Next.js Image component
3. Implement proper caching headers
4. Use static generation where possible

## Scaling Considerations

### Database Scaling

- Monitor connection limits
- Consider read replicas for high traffic
- Implement database connection pooling
- Plan for data archival strategies

### Function Limits

- Monitor Vercel function execution time
- Optimize long-running operations
- Consider breaking up complex operations
- Use background jobs for heavy processing

## Backup Strategy

### Database Backups

1. Automatic backups (Vercel Postgres)
2. Manual exports before major updates
3. Test backup restoration process
4. Store backups in multiple locations

### Application Backups

1. Source code in Git repository
2. Environment variables documented
3. Database schema versioned
4. Regular deployment snapshots

## Cost Optimization

1. Monitor Vercel usage dashboard
2. Optimize function execution time
3. Use appropriate database sizing
4. Monitor email sending volume
5. Optimize asset delivery

This deployment guide ensures a production-ready LifeLines application with proper security, monitoring, and maintenance procedures.