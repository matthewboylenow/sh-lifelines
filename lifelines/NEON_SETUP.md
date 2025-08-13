# 🚀 Neon Database Setup for LifeLines

## Step 1: Create Neon Account & Database

1. **Go to [neon.tech](https://neon.tech)**
2. **Sign up** with GitHub/Google or email
3. **Create new project** 
   - Project name: `lifelines-db`
   - Region: Choose closest to you (US East, EU West, etc.)
4. **Wait for database creation** (takes ~30 seconds)

## Step 2: Get Your Connection String

1. **In your Neon dashboard**, you'll see your connection details
2. **Click on "Connection Details"** or look for the database URL
3. **Copy the connection string** - it looks like:
   ```
   postgresql://username:password@ep-something-12345.region.aws.neon.tech/neondb?sslmode=require
   ```

## Step 3: Update Your Environment File

**Replace the DATABASE_URL in your `.env.local` file:**

```bash
# Open the .env.local file and replace this line:
DATABASE_URL="postgresql://username:password@ep-hostname.us-east-2.aws.neon.tech/neondb?sslmode=require"

# With your actual Neon connection string (something like):
DATABASE_URL="postgresql://neondb_owner:npg_ABC123@ep-fancy-name-a8lknof6-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"
```

## Step 4: Initialize Your Database

**Once you've updated the DATABASE_URL, run:**

```bash
# Push the database schema to Neon
npm run db:push

# Add sample data
npm run db:seed

# Start the app
npm run dev
```

## Step 5: Test Connection

1. **Visit** [http://localhost:3000](http://localhost:3000)
2. **Go to login** [http://localhost:3000/login](http://localhost:3000/login)
3. **Login with**: admin@sainthelen.org / admin123
4. **Check the dashboard** loads properly

---

## ✅ Your Neon Connection String Should Look Like:

```
postgresql://[username]:[password]@[host]/[database]?sslmode=require
```

**Real example:**
```
postgresql://neondb_owner:npg_K3Pd2owYlfvN@ep-raspy-forest-a8lknof6-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require
```

---

## 🔧 Troubleshooting

**If you get "Environment variable not found: DATABASE_URL":**
- Make sure you saved the `.env.local` file
- Restart your terminal/IDE
- Double-check the connection string format

**If you get "database connection failed":**
- Verify your Neon database is active (not sleeping)
- Check the connection string is exact (no extra spaces)
- Make sure you're in the right directory

**If seeding fails:**
- Run `npm run db:push --force-reset` to reset
- Then `npm run db:seed` again

---

## 💡 Neon Benefits

- **Free tier**: 3GB storage, 1 compute unit
- **Serverless**: Automatically sleeps when not in use
- **Branching**: Create database branches for testing
- **Backups**: Automatic point-in-time recovery
- **SSL**: Secure connections by default

---

## Next Steps After Setup

1. **Test all functionality** with the sample data
2. **Customize the app** for Saint Helen Church
3. **Set up Elastic Email** for notifications
4. **Deploy to production** when ready

**You're ready to go! 🎉**