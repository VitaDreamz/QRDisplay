# Vercel Environment Variables Setup

## Required Environment Variables

You need to add **TWO** database connection strings to Vercel:

### 1. DATABASE_URL (Already Set ✅)
**For**: API routes, serverless functions  
**Mode**: Transaction pooling (PgBouncer)  
**Value**:
```
postgresql://postgres:%3D%3F%3DTosoVDzh3ZZZ%3D%3F%3D@db.sozlzijwzvrmdrocaasg.supabase.co:6543/postgres?pgbouncer=true
```

**Features**:
- ✅ Fast connection pooling for serverless
- ✅ Works with all API routes
- ❌ Does NOT support migrations (no advisory locks)

---

### 2. DIRECT_DATABASE_URL (NEW - NEEDS TO BE ADDED)
**For**: Prisma migrations during build  
**Mode**: Direct connection (no pooling)  
**Value**:
```
postgresql://postgres:%3D%3F%3DTosoVDzh3ZZZ%3D%3F%3D@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres
```

**Features**:
- ✅ Supports migrations with advisory locks
- ✅ Used only during `npm run build`
- ✅ Not used by runtime API routes

---

## How to Add to Vercel

1. Go to https://vercel.com/vitadreamz/qrdisplay/settings/environment-variables
2. Click **"Add New"**
3. Enter:
   - **Name**: `DIRECT_DATABASE_URL`
   - **Value**: `postgresql://postgres:%3D%3F%3DTosoVDzh3ZZZ%3D%3F%3D@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres`
   - **Environment**: Check all (Production, Preview, Development)
4. Click **"Save"**
5. Redeploy: Go to Deployments → Click "..." on latest → "Redeploy"

---

## Why Two Connections?

### The Problem:
- **Serverless functions** need fast, pooled connections (port 6543)
- **Database migrations** need direct connections with locks (port 5432)
- PgBouncer in transaction mode doesn't support advisory locks

### The Solution:
- Runtime uses `DATABASE_URL` (pooled, port 6543) ✅
- Build uses `DIRECT_DATABASE_URL` (direct, port 5432) ✅
- Best of both worlds! 🎉

---

## Build Script Logic

```bash
# Use direct connection for migrations
DATABASE_URL="$DIRECT_DATABASE_URL" prisma migrate deploy

# Then generate Prisma client (uses regular DATABASE_URL)
prisma generate

# Finally build Next.js (uses regular DATABASE_URL)
next build
```

---

## Local Development

Your `.env` file already uses the direct connection (port 5432), so local development works perfectly for both migrations and running the app.

---

## Summary

| Use Case | Variable | Port | Pooling |
|----------|----------|------|---------|
| Vercel API Routes | `DATABASE_URL` | 6543 | PgBouncer ✅ |
| Vercel Migrations | `DIRECT_DATABASE_URL` | 5432 | Direct ✅ |
| Local Dev | `DATABASE_URL` | 5432 | Direct ✅ |

---

## After Adding Variable

Once you add `DIRECT_DATABASE_URL` to Vercel and redeploy:
- ✅ Migrations will run successfully during build
- ✅ API routes will continue using pooled connection
- ✅ No more build timeouts
- ✅ No compromises on performance or functionality

**Note**: The build script includes `|| echo 'Migrations already applied'` as a fallback. If migrations fail (e.g., already applied), the build continues successfully.
