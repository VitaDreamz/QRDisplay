# 🔐 Magic Link Authentication System

## Overview

The magic link authentication system provides passwordless login for store dashboard access. Store owners can securely access their dashboard by receiving a magic link via both email and SMS.

## How It Works

### User Flow

1. **Store visits login page** → `/store/login`
2. **Enters credentials:**
   - Store ID (e.g., `SID-001`)
   - Contact info (email OR phone number)
3. **System validates and sends links:**
   - Verifies store exists
   - Confirms contact matches store records
   - Generates secure token
   - Sends magic link via BOTH email and SMS
4. **Store clicks link** → `/store/auth/verify?token=...`
5. **Auto-logged in** → Redirected to `/store/dashboard`

### Security Features

- ✅ **15-minute expiration** - Links automatically expire
- ✅ **One-time use** - Token marked as used after first verification
- ✅ **Contact verification** - Must match store records
- ✅ **Secure tokens** - 32-byte cryptographic randomness (64 hex chars)
- ✅ **HttpOnly cookies** - Session cookies not accessible via JavaScript
- ✅ **HTTPS-only** - Secure cookies in production
- ✅ **7-day sessions** - Stays logged in for a week

## File Structure

```
app/
├── store/
│   ├── login/
│   │   └── page.tsx                    # Login form UI
│   ├── dashboard/
│   │   ├── page.tsx                    # Protected dashboard (checks auth)
│   │   └── StoreDashboardClient.tsx    # Dashboard UI components
│   └── auth/
│       ├── verify/
│       │   └── route.ts                # Token verification endpoint
│       └── logout/
│           └── route.ts                # Logout endpoint
└── api/
    └── store/
        └── auth/
            └── send-magic-link/
                └── route.ts            # Token generation & sending

prisma/
└── schema.prisma                       # MagicLink model definition

scripts/
└── test-magic-link.ts                  # Testing script
```

## API Endpoints

### POST /api/store/auth/send-magic-link

Generates and sends magic link tokens.

**Request:**
```json
{
  "storeId": "SID-001",
  "contact": "store@example.com" // or phone number
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Magic links sent to email and phone"
}
```

**Response (Error):**
```json
{
  "error": "Store not found"
}
// or
{
  "error": "Contact info does not match our records"
}
```

**Process:**
1. Validates store exists
2. Verifies contact matches store records (email OR phone)
3. Generates secure token using `crypto.randomBytes(32)`
4. Creates MagicLink record in database
5. Sends email via Resend
6. Sends SMS via Twilio
7. Returns success (graceful degradation if one channel fails)

### GET /store/auth/verify?token=...

Verifies magic link token and creates session.

**Query Params:**
- `token` (required) - 64-character hex token

**Success Flow:**
1. Looks up token in database
2. Validates:
   - Token exists
   - Not already used
   - Not expired
3. Marks token as used
4. Sets session cookies:
   - `store-session` - Token for session validation
   - `store-id` - Store ID for data access
5. Redirects to `/store/dashboard`

**Error Redirects:**
- Invalid token → `/store/login?error=invalid`
- Expired token → `/store/login?error=expired`
- Used token → `/store/login?error=used`
- Server error → `/store/login?error=server`

### GET|POST /store/auth/logout

Clears session and logs out user.

- **GET** - Clears cookies and redirects to `/store/login`
- **POST** - Clears cookies and returns JSON

## Database Schema

### MagicLink Model

```prisma
model MagicLink {
  id        String   @id @default(cuid())
  token     String   @unique      // 64-char hex token
  storeId   String                // Store this token is for
  expiresAt DateTime              // 15 minutes from creation
  used      Boolean  @default(false)  // One-time use flag
  usedAt    DateTime?             // Timestamp of usage
  createdAt DateTime @default(now())
  
  @@map("magic_links")
}
```

**Fields:**
- `token` - Unique 64-character hex string (32 random bytes)
- `storeId` - Links token to specific store
- `expiresAt` - Token expires 15 minutes after creation
- `used` - Prevents token reuse
- `usedAt` - Tracks when token was used (for auditing)

## Message Templates

### Email Template (Resend)

```
Subject: Your Store Dashboard Login Link

Hi [Store Name] team!

Click the link below to access your store dashboard:

[Access Dashboard Button]
→ https://qrdisplay.com/store/auth/verify?token=abc123...

Or copy this link:
https://qrdisplay.com/store/auth/verify?token=abc123...

This link expires in 15 minutes.

---
QRDisplay
```

### SMS Template (Twilio)

```
[Store Name]: Access your dashboard: 
https://qrdisplay.com/store/auth/verify?token=abc123

Expires in 15 min.
```

*Note: SMS kept short (~160 chars) for optimal delivery*

## Store Onboarding

When adding a new store:

1. **Create store in admin dashboard**
   - Set `contactEmail` and `contactPhone`
   - Note the generated `storeId`

2. **Send onboarding message:**
   ```
   Welcome to QRDisplay!
   
   Access your dashboard at:
   https://qrdisplay.com/store/login
   
   Your Store ID: SID-042
   
   Use the email/phone we have on file to login.
   No password needed - we'll send you a magic link!
   ```

3. **Store logs in:**
   - Enters their Store ID
   - Enters their email or phone
   - Receives magic links
   - Clicks either link → Logged in! ✅

## Error Handling

### Login Page Errors

Display friendly messages for URL error params:

| Error Param | Message |
|-------------|---------|
| `invalid` | "Invalid or expired magic link. Please request a new one." |
| `expired` | "Magic link expired. Links are valid for 15 minutes." |
| `used` | "This magic link has already been used. Please request a new one." |
| `server` | "Server error. Please try again." |
| `notfound` | "Store not found. Please check your Store ID." |

### API Error Responses

**Store not found (404):**
```json
{ "error": "Store not found" }
```

**Contact mismatch (403):**
```json
{ "error": "Contact info does not match our records" }
```

**Server error (500):**
```json
{ "error": "Failed to send magic link" }
```

## Testing

### Manual Testing

1. **Start the server:**
   ```bash
   npm run dev -- --port 3001
   ```

2. **Visit login page:**
   ```
   http://localhost:3001/store/login
   ```

3. **Test with valid store:**
   - Enter a valid Store ID (e.g., `SID-VITADREAMZ`)
   - Enter matching email or phone
   - Check console logs for magic link URL
   - Copy and visit the URL
   - Should redirect to dashboard

4. **Test error cases:**
   - Wrong Store ID → Should show error
   - Wrong contact info → Should show error
   - Visit expired/used link → Should redirect with error

### Automated Testing Script

```bash
npx tsx scripts/test-magic-link.ts
```

**What it tests:**
- ✅ Token generation
- ✅ Database storage
- ✅ Token retrieval
- ✅ Expiration detection
- ✅ Usage tracking
- ✅ Cleanup

**Expected output:**
```
🔐 Testing Magic Link Authentication System

📍 Step 1: Finding test store...
✅ Found store: Smokezone Venice (SID-001)
   Email: store@example.com
   Phone: +15551234567

📍 Step 2: Generating magic link token...
✅ Token generated: a1b2c3d4e5f6...
   Expires at: 11/3/2025, 3:45:00 PM
   Magic Link ID: clxyz123

... [more steps] ...

🎉 ALL TESTS PASSED!
```

## Environment Variables

Required in `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://..."

# Email (Resend)
RESEND_API_KEY="re_..."

# SMS (Twilio)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+15551234567"

# App URL
NEXT_PUBLIC_BASE_URL="https://qrdisplay.com"
# or for development:
NEXT_PUBLIC_BASE_URL="http://localhost:3001"
```

## Production Checklist

Before deploying:

- [ ] Set `NEXT_PUBLIC_BASE_URL` to production domain
- [ ] Verify Resend API key is valid
- [ ] Verify Twilio credentials are valid
- [ ] Test email delivery in production
- [ ] Test SMS delivery in production
- [ ] Set `NODE_ENV=production` for secure cookies
- [ ] Enable HTTPS for production domain
- [ ] Test complete login flow in production
- [ ] Monitor failed login attempts
- [ ] Set up alerts for suspicious activity

## Rate Limiting (Optional)

To prevent abuse, consider adding:

```typescript
// Max 3 magic links per store per hour
const recentLinks = await prisma.magicLink.count({
  where: {
    storeId,
    createdAt: {
      gte: new Date(Date.now() - 60 * 60 * 1000)
    }
  }
});

if (recentLinks >= 3) {
  return NextResponse.json(
    { error: 'Too many login attempts. Try again in 1 hour.' },
    { status: 429 }
  );
}
```

## Cleanup Strategy

Old magic links should be cleaned up periodically:

```typescript
// Delete expired and used links older than 7 days
await prisma.magicLink.deleteMany({
  where: {
    createdAt: {
      lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    OR: [
      { used: true },
      { expiresAt: { lt: new Date() } }
    ]
  }
});
```

Run this as a cron job or background task.

## Troubleshooting

### "Property 'magicLink' does not exist"

**Cause:** Prisma client not regenerated after schema changes.

**Fix:**
```bash
npx prisma generate
# Restart your IDE/TypeScript server
```

### "Token not found"

**Cause:** Token doesn't exist in database or was already deleted.

**Fix:** Request a new magic link.

### "Token expired"

**Cause:** More than 15 minutes passed since token creation.

**Fix:** Request a new magic link.

### Email/SMS not sending

**Causes:**
- Invalid API credentials
- Network issues
- Service outage

**Debug:**
1. Check environment variables
2. Check console logs for errors
3. Test API credentials with provider's dashboard
4. Verify phone number format (E.164: +1XXXXXXXXXX)

### Session not persisting

**Cause:** Cookies not being set or cleared.

**Fix:**
1. Check browser allows cookies
2. Verify cookie settings in verification endpoint
3. Check `secure` flag (false in dev, true in prod)
4. Clear browser cookies and try again

## Benefits

### For Store Owners
- ✅ No password to remember or reset
- ✅ Fast login (one click)
- ✅ Works on any device
- ✅ Secure (one-time, expiring links)
- ✅ Multiple options (email OR phone)

### For Platform
- ✅ No password storage or hashing
- ✅ No password reset flow needed
- ✅ Better security (no weak passwords)
- ✅ Simpler user management
- ✅ Lower support burden

### For Development
- ✅ Clean, simple implementation
- ✅ Easy to test
- ✅ Easy to extend
- ✅ Well-documented pattern
- ✅ Industry standard approach

## Future Enhancements

Potential improvements:

1. **Remember device** - Skip magic link for trusted devices
2. **Biometric auth** - Use Face ID/Touch ID on mobile
3. **Session management** - List active sessions, revoke access
4. **Login notifications** - Alert on new logins
5. **2FA option** - Extra security for sensitive accounts
6. **Audit log** - Track all login attempts
7. **IP restrictions** - Limit logins to certain locations
8. **Device fingerprinting** - Detect suspicious devices

## Support

If you encounter issues:

1. Check this documentation
2. Run the test script: `npx tsx scripts/test-magic-link.ts`
3. Check server logs for errors
4. Verify environment variables
5. Test with a known-good store
6. Contact development team

---

**Built with:** Next.js 16, Prisma, Resend, Twilio  
**Status:** ✅ Production Ready  
**Last Updated:** November 3, 2025
