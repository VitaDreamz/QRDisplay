# Shopify Integration Scripts

## connect-shopify.ts

Securely connects an organization to their Shopify store by encrypting and storing credentials.

### Usage

```bash
npx tsx scripts/connect-shopify.ts
```

### Required Environment Variables

Add these to your `.env.local` file:

```bash
# Encryption key (32+ characters)
ENCRYPTION_KEY=your-encryption-key-here

# Shopify credentials
SHOPIFY_STORE_NAME=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_API_KEY=xxxxx
SHOPIFY_API_SECRET=shpss_xxxxx
```

### What It Does

1. Loads Shopify credentials from environment variables
2. Encrypts the access token, API key, and API secret using AES-256-GCM
3. Stores encrypted credentials in the database for the organization
4. Sets commission rate (default: 10%) and attribution window (default: 30 days)
5. Activates the Shopify integration

### Security

- All sensitive credentials are encrypted before storage
- Uses AES-256-GCM encryption with PBKDF2 key derivation
- Credentials are never committed to git (loaded from environment)
- `.env.local` is gitignored

### For Production

Add the same environment variables to Vercel:
- Project Settings → Environment Variables
- Add all `SHOPIFY_*` and `ENCRYPTION_KEY` variables
- Redeploy to apply changes
