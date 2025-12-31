# Quick Start Guide - Database Setup

## ✅ All Backend Files Are Now Fixed!

I've made the following changes to your backend:

### 1. Fixed `prisma/schema.prisma`
- Changed provider to `"prisma-client-js"`
- Added `engineType = "binary"`
- This fixes the error about needing an adapter

### 2. Updated `.env` file
- Changed from Prisma Accelerate URL to direct PostgreSQL connection
- Added `DATABASE_URL="postgresql://postgres:password@localhost:5432/zoho_erp?schema=public"`

### 3. Verified `src/lib/db.ts`
- ✅ Already correctly configured
- No changes needed

## 🚀 Next Steps (You Need To Do These)

### Step 1: Make Sure PostgreSQL is Installed and Running

**Check if PostgreSQL is running:**
```bash
psql --version
```

**If not installed, install PostgreSQL:**
- **Windows:** Download from https://www.postgresql.org/download/windows/
- **Mac:** `brew install postgresql`
- **Linux:** `sudo apt-get install postgresql`

**Or use Docker (easiest way):**
```bash
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

### Step 2: Create the Database

**Option A: Using psql**
```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql, create the database:
CREATE DATABASE zoho_erp;

# Exit psql
\q
```

**Option B: Using pgAdmin**
1. Open pgAdmin
2. Right-click on "Databases"
3. Select "Create" → "Database"
4. Name it: `zoho_erp`
5. Click "Save"

### Step 3: Update Your PostgreSQL Password (if different)

If your PostgreSQL password is NOT "password", update the `.env` file:

```env
# Change "password" to your actual PostgreSQL password
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/zoho_erp?schema=public"
```

### Step 4: Generate Prisma Client and Push Schema

```bash
# Make sure you're in the backend directory
cd C:\Projects\zoho\backend

# Generate Prisma Client with the new configuration
npm run db:generate

# Push the schema to create all tables in the database
npm run db:push
```

You should see output like:
```
✔ Generated Prisma Client
🚀  Your database is now in sync with your Prisma schema.
```

### Step 5: Start the Backend Server

```bash
npm run dev
```

You should see:
```
✅ Database connected successfully
✅ Server running on http://localhost:5000
```

## 🎉 That's It!

Your backend should now be running without any database connection errors.

## 🔍 Common Issues and Solutions

### Issue: "password authentication failed"
**Solution:** Your PostgreSQL password is different. Update it in `.env`:
```env
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/zoho_erp?schema=public"
```

### Issue: "database zoho_erp does not exist"
**Solution:** Create the database:
```bash
psql -U postgres -c "CREATE DATABASE zoho_erp;"
```

### Issue: "ECONNREFUSED ::1:5432"
**Solution:** PostgreSQL is not running. Start it:
```bash
# Windows (as Administrator)
net start postgresql-x64-16

# Mac
brew services start postgresql

# Docker
docker start postgres
```

### Issue: "role postgres does not exist"
**Solution:** Use a different user or create the postgres role:
```bash
createuser -s postgres
```

## 📝 Summary of Changes

| File | Change | Why |
|------|--------|-----|
| `prisma/schema.prisma` | Added `engineType = "binary"` and fixed provider name | Fixes "requires adapter" error |
| `.env` | Changed to direct PostgreSQL URL | Binary engine needs direct connection |
| `src/lib/db.ts` | No changes | Already correctly configured |

## Need Help?

If you run into any issues, check the detailed documentation in `DATABASE_FIX_SUMMARY.md`
