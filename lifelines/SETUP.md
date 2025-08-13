# LifeLines Setup Guide

## 🚀 **Quick Start (5 minutes)**

### **Step 1: Database Setup**

**Option A: Docker (Easiest)**
```bash
# Start PostgreSQL container
docker-compose up -d

# Your database is ready at:
# postgresql://lifelines_user:lifelines_password@localhost:5432/lifelines_db
```

**Option B: Supabase (Free Cloud Database)**
1. Go to [supabase.com](https://supabase.com) and create account
2. Create new project
3. Go to Settings → Database
4. Copy the connection string

**Option C: Railway (Simple Cloud)**
1. Go to [railway.app](https://railway.app) and create account
2. Deploy PostgreSQL service
3. Copy the connection string from Variables tab

### **Step 2: Configure Environment**

Update your `.env.local` file:

```env
# Required - Replace with your database URL
DATABASE_URL="postgresql://lifelines_user:lifelines_password@localhost:5432/lifelines_db"

# Required - Use a secure random string
NEXTAUTH_SECRET="your-very-secure-secret-change-this-random-string-abc123"

# App URLs
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
ADMIN_EMAIL="admin@sainthelen.org"

# Optional: Elastic Email (for notifications)
ELASTIC_EMAIL_USERNAME=""
ELASTIC_EMAIL_PASSWORD=""
FROM_EMAIL="noreply@sainthelen.org"
```

### **Step 3: Initialize Database**

```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Add sample data
npm run db:seed
```

### **Step 4: Start Development**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### **Step 5: Login and Test**

Use these sample accounts:
- **Admin**: admin@sainthelen.org / admin123
- **Leader**: maria.fusillo@example.com / leader123

---

## 📧 **Elastic Email Setup (Optional)**

### **1. Create Elastic Email Account**
1. Go to [elasticemail.com](https://elasticemail.com)
2. Sign up for free account (100 emails/day free)

### **2. Get API Credentials**
1. Go to Settings → SMTP/API
2. Create new SMTP credential
3. Copy username and password

### **3. Update Environment Variables**
```env
ELASTIC_EMAIL_USERNAME="your-smtp-username"
ELASTIC_EMAIL_PASSWORD="your-smtp-password"
FROM_EMAIL="noreply@sainthelen.org"
```

### **4. Verify Domain (Production)**
1. Go to Settings → Domains
2. Add your domain (sainthelen.org)
3. Follow DNS verification steps

---

## 🗄️ **Database Options Detailed**

### **Local PostgreSQL Installation**

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE lifelines_db;
CREATE USER lifelines_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE lifelines_db TO lifelines_user;
\q
```

**macOS (Homebrew):**
```bash
brew install postgresql
brew services start postgresql

# Create database
createdb lifelines_db
```

**Windows:**
1. Download PostgreSQL installer
2. Follow installation wizard
3. Remember your postgres password

### **Cloud Database Comparison**

| Provider | Free Tier | Pricing | Best For |
|----------|-----------|---------|----------|
| **Supabase** | 500MB, 2 CPU hrs | Free → $25/mo | Development & Production |
| **Railway** | $0 → $5/mo | $5/mo starter | Simple deployment |
| **Neon** | 3GB, 1 branch | Free → $19/mo | Serverless apps |
| **Heroku Postgres** | 10k rows | $0 → $9/mo | Heroku deployments |

---

## 🔐 **Security Setup**

### **Generate Secure NEXTAUTH_SECRET**
```bash
# Generate random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use online generator
# https://generate-secret.vercel.app/32
```

### **Production Environment Variables**
```env
# Production Database
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# Secure Secret (32+ characters)
NEXTAUTH_SECRET="your-super-secure-production-secret-key-here"

# Production URLs
NEXTAUTH_URL="https://lifelines.sainthelen.org"
APP_URL="https://lifelines.sainthelen.org"

# Real Email Credentials
ELASTIC_EMAIL_USERNAME="your-real-username"
ELASTIC_EMAIL_PASSWORD="your-real-api-key"
FROM_EMAIL="noreply@sainthelen.org"
ADMIN_EMAIL="support@sainthelen.org"
```

---

## 🚨 **Troubleshooting**

### **Database Connection Issues**

**Error: "database does not exist"**
```bash
# Create database manually
createdb lifelines_db
# Or via psql:
sudo -u postgres psql -c "CREATE DATABASE lifelines_db;"
```

**Error: "password authentication failed"**
```bash
# Reset postgres password (Linux)
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
\q
```

### **Prisma Issues**

**Error: "Schema drift detected"**
```bash
npm run db:push --force-reset
npm run db:seed
```

**Error: "Prisma Client not generated"**
```bash
npm run db:generate
```

### **Next.js Issues**

**Error: "NEXTAUTH_SECRET missing"**
```bash
# Add to .env.local:
NEXTAUTH_SECRET="your-secret-key"
```

**Error: "Module not found"**
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

---

## 📋 **Pre-Launch Checklist**

### **Development Complete ✅**
- [ ] Database connected and seeded
- [ ] Login working with test accounts
- [ ] Dashboards loading properly
- [ ] LifeLines displaying on homepage
- [ ] No console errors

### **Production Ready**
- [ ] Production database configured
- [ ] Environment variables secured
- [ ] Domain configured for email
- [ ] SSL certificates installed
- [ ] Backup strategy in place

### **Migration Ready**
- [ ] WordPress data exported
- [ ] Data mapping completed
- [ ] Test migration performed
- [ ] User communication planned

---

## 🎯 **Next Steps After Setup**

1. **Test all functionality** with sample data
2. **Customize branding** (logos, colors, content)
3. **Set up email templates** for your church
4. **Plan WordPress migration** strategy
5. **Train users** on new system

---

## 💡 **Tips & Best Practices**

- **Start with Docker** for development
- **Use cloud database** for production
- **Test email functionality** early
- **Backup database** regularly
- **Monitor performance** in production
- **Keep dependencies updated**

---

## 📞 **Need Help?**

- Check the main [README.md](README.md) for detailed documentation
- Review API endpoints in `src/app/api/`
- Check database schema in `prisma/schema.prisma`
- Look at sample data in `prisma/seed.ts`

**Ready to deploy? The system is production-ready! 🎉**