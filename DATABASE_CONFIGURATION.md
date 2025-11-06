# Database Configuration Summary

## ✅ CONFIRMED: All Database Writes Go to Supabase

### Railway Migration Completed
- **Migration Date**: November 6, 2025
- **Records Migrated**: 127 total
- **Status**: Railway is now **DEPRECATED** and only used for backup reference

---

## Current Database Connections

### 🟢 Supabase (ACTIVE)
**Project**: `sozlzijwzvrmdrocaasg`
**Host**: `db.sozlzijwzvrmdrocaasg.supabase.co`

#### Local Development
- **File**: `.env`
- **Connection**: Pooled (Port 5432)
- **URL**: `postgresql://postgres:%3D%3F%3DTosoVDzh3ZZZ%3D%3F%3D@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres`
- **Verified**: ✅ Connected and writing successfully

#### Vercel Production
- **Environment Variable**: `DATABASE_URL`
- **Connection**: Transaction Mode (Port 6543) with PgBouncer
- **URL**: `postgresql://postgres:%3D%3F%3DTosoVDzh3ZZZ%3D%3F%3D@db.sozlzijwzvrmdrocaasg.supabase.co:6543/postgres?pgbouncer=true`
- **Updated**: November 6, 2025
- **Reason**: Serverless functions require Transaction mode for short-lived connections

---

## Configuration Verification

### ✅ Environment Files
1. **`.env`** → Points to Supabase ✅
2. **`.env.local`** → No DATABASE_URL (doesn't override) ✅
3. **`.env.example`** → Template for new developers ✅

### ✅ Prisma Client
- **File**: `lib/prisma.ts`
- **Connection**: Uses `process.env.DATABASE_URL` (no hardcoded URLs)
- **Singleton Pattern**: Single instance across serverless invocations

### ✅ Railway References (Deprecated)
Railway connection strings only exist in these **historical backup scripts**:
- `scripts/backup-railway.ts` - Creates JSON backup from Railway
- `scripts/check-railway-db.ts` - Debugging tool for old database
- `scripts/migrate-to-supabase.ts` - One-time migration script

**No production code references Railway** ✅

---

## Verification Results

### Local Development (as of Nov 6, 2025)
```
🔍 Connected to: SUPABASE
   Host: db.sozlzijwzvrmdrocaasg.supabase.co

📊 Database Contents:
   Organizations: 2
   Stores: 4
   Displays: 35
   Staff: 1
   Customers: 12
   Products: 18
```

### Production (Vercel)
- DATABASE_URL updated to Supabase Transaction mode
- Auto-deploys on push to main branch
- All API routes write to Supabase database

---

## Connection Modes Explained

### Pooled (Port 5432)
- **Use Case**: Local development, long-lived connections
- **PgBouncer**: Disabled
- **Max Connections**: Higher limit
- **Best For**: Next.js dev server, scripts

### Transaction (Port 6543)
- **Use Case**: Vercel production, serverless functions
- **PgBouncer**: Enabled with `?pgbouncer=true`
- **Connection Mode**: Transaction pooling (not session)
- **Best For**: Short-lived serverless invocations
- **Why**: Prevents "Can't reach database server" errors in serverless

---

## Future Developers

If you see errors related to database connections:

1. **Local Development**
   - Check `.env` file exists and points to Supabase
   - Run `npx tsx scripts/verify-database.ts` to confirm connection
   - Should see "✅ Connected to: SUPABASE"

2. **Vercel Production**
   - Verify `DATABASE_URL` in Vercel dashboard → Settings → Environment Variables
   - Should use port **6543** with `?pgbouncer=true`
   - Re-deploy if environment variable changed

3. **Railway (OLD)**
   - DO NOT use Railway database
   - Migration completed November 6, 2025
   - Railway scripts kept for historical reference only

---

## Troubleshooting

### Error: "Can't reach database server"
**Cause**: Using wrong connection mode in serverless
**Fix**: Use Transaction mode (port 6543) for Vercel production

### Error: "Too many connections"
**Cause**: Connection pool exhausted
**Fix**: Ensure Prisma client uses singleton pattern in `lib/prisma.ts`

### Error: "Prepared statement already exists"
**Cause**: PgBouncer in session mode instead of transaction mode
**Fix**: Add `?pgbouncer=true` to DATABASE_URL query string

---

## Summary

✅ **Local Development**: Writing to Supabase (port 5432)
✅ **Vercel Production**: Writing to Supabase (port 6543)
✅ **Railway**: Deprecated, not used in production
✅ **All API Routes**: Use `lib/prisma.ts` → Supabase
✅ **Verification Script**: `scripts/verify-database.ts`

**Last Verified**: November 6, 2025
