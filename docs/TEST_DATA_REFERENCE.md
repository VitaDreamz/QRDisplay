# Multi-Brand Test Data Reference

## Auto-Generated Test Data

When you run the test brand onboarding scripts, here's exactly what gets created:

---

## 1. Brand Organization (`onboard-test-brand.ts`)

### Command:
```bash
npx tsx scripts/onboard-test-brand.ts --name "Dream Supplements" --tier pro --approve
```

### Auto-Generated Fields:

**Organization Record:**
```typescript
{
  // IDs (auto-generated)
  orgId: "ORG-DRS7kq",              // Format: ORG-{3 initials}{3 random}
  slug: "dream-supplements",         // Kebab-case from name
  
  // Basic Info
  name: "Dream Supplements",         // From --name flag
  type: "client",                    // Always 'client' for brands
  
  // Contact Info (test data)
  supportEmail: "support@dream-supplements.com",
  supportPhone: "+1-555-TEST",
  emailFromName: "Dream Supplements",
  emailFromAddress: "hello@dream-supplements.com",
  emailReplyTo: "support@dream-supplements.com",
  websiteUrl: "https://www.dream-supplements.com",
  customerServiceEmail: "service@dream-supplements.com",
  customerServicePhone: "+1-555-HELP",
  
  // Shopify (not connected yet)
  shopifyStoreName: "dream-supplements.myshopify.com",
  shopifyActive: false,
  shopifyAccessToken: null,         // Connect later
  
  // Subscription Tier (from --tier flag)
  brandTier: "pro",
  brandStatus: "approved",          // If --approve flag used
  maxStoresPerMonth: 100,           // Pro tier limit
  maxSampleProducts: 5,             // Pro tier limit
  maxFullSizeProducts: 10,          // Pro tier limit
  
  // Revenue Settings
  transactionFeePercent: 5.0,       // QRDisplay takes 5% per sale
  monthlyPlatformFee: 249.00,       // Pro tier monthly fee
  
  // Commission Defaults
  commissionRate: 10.0,             // Store gets 10% of sales
  attributionWindow: 30,            // 30 days
  
  // Workflow
  approvalStatus: "approved",
  onboardingStep: "live",
  approvedAt: "2025-11-12T...",
  approvedBy: "SCRIPT",
  
  // Tracking
  storesAddedThisMonth: 0,
  currentActiveStores: 0,
  lastMonthlyReset: "2025-11-12T...",
}
```

### Sample Products Created:
```typescript
// Based on tier limits (Pro = 5 samples max)
[
  {
    sku: "ORG-DRS7kq-SAMPLE-1",
    name: "Energy Boost Sample",
    category: "sample",
    productType: "retail",
    price: 0.00,           // Samples are free
    msrp: 5.99,
    active: true,
    featured: true,
    imageUrl: "https://via.placeholder.com/400x400?text=Energy+Boost+Sample"
  },
  {
    sku: "ORG-DRS7kq-SAMPLE-2",
    name: "Sleep Aid Sample",
    // ... similar structure
  },
  {
    sku: "ORG-DRS7kq-SAMPLE-3",
    name: "Immunity Support Sample",
    // ... similar structure
  },
  {
    sku: "ORG-DRS7kq-SAMPLE-4",
    name: "Focus & Clarity Sample",
    // ... similar structure
  },
  {
    sku: "ORG-DRS7kq-SAMPLE-5",
    name: "Stress Relief Sample",
    // ... similar structure
  }
]
```

### Full-Size Products Created:
```typescript
// Based on tier limits (Pro = 10 products max, but script creates realistic 2-5)
[
  {
    sku: "ORG-DRS7kq-FULL-1",
    name: "Energy Boost - 30 Day Supply",
    category: "supplement",
    productType: "retail",
    price: 39.99,
    msrp: 49.99,
    active: true,
    featured: true,         // First product is featured
    imageUrl: "https://via.placeholder.com/400x400?text=Energy+Boost+30+Day"
  },
  {
    sku: "ORG-DRS7kq-FULL-2",
    name: "Sleep Aid - 30 Day Supply",
    price: 39.99,
    msrp: 49.99,
    active: true,
    featured: false,
    // ... similar structure
  }
]
```

---

## 2. Store-Brand Partnership (`connect-brand-to-store.ts`)

### Command:
```bash
npx tsx scripts/connect-brand-to-store.ts --brand ORG-DRS7kq --store STORE-ABC123
```

### Auto-Generated Fields:

**StoreBrandPartnership Record:**
```typescript
{
  // IDs
  storeId: "clxxx...",              // Store's database ID
  brandId: "clyyy...",              // Brand's database ID
  
  // Partnership Settings
  commissionRate: 10.0,             // From brand's default (or --commission flag)
  availableSamples: [               // ALL sample SKUs by default
    "ORG-DRS7kq-SAMPLE-1",
    "ORG-DRS7kq-SAMPLE-2",
    "ORG-DRS7kq-SAMPLE-3",
    "ORG-DRS7kq-SAMPLE-4",
    "ORG-DRS7kq-SAMPLE-5"
  ],
  availableProducts: [              // ALL full-size SKUs by default
    "ORG-DRS7kq-FULL-1",
    "ORG-DRS7kq-FULL-2"
  ],
  
  // Status
  active: true,
  partnerSince: "2025-11-12T...",
  partnershipEndedAt: null,
  
  // Optional
  notes: null
}
```

**Store Updates (automatic):**
```typescript
{
  activeBrandCount: 2,              // Incremented automatically
  // maxBrandPartnerships: unchanged (set by subscription)
}
```

**Brand Updates (automatic):**
```typescript
{
  currentActiveStores: 15,          // Incremented automatically
  storesAddedThisMonth: 8,          // Incremented (resets monthly)
}
```

---

## 3. Customer Sample Flow (when customer scans QR)

### What Gets Created When Customer Requests Sample:

**Customer Record (if new phone number):**
```typescript
{
  memberId: "MEM-ABC123",
  orgId: "ORG-QRDISPLAY",           // Platform org
  storeId: "STORE-ABC123",
  
  firstName: "John",                // From form
  lastName: "Doe",
  phone: "+15551234567",            // Key for recognition
  email: "john@example.com",
  
  // Legacy field (will phase out)
  sampleChoice: "ORG-DRS7kq-SAMPLE-1",
  
  // NEW: Daily limit tracking
  lastSampleDate: "2025-11-12",     // Date only (no time)
  
  // Status
  activated: true,
  activatedAt: "2025-11-12T...",
  redeemed: false,
  currentStage: "pending"
}
```

**SampleHistory Record (NEW - one per brand sample):**
```typescript
{
  customerId: "clxxx...",
  brandId: "clyyy...",              // Which brand's sample
  storeId: "clzzz...",              // Which store gave it
  displayId: "QRD-001",
  
  productSku: "ORG-DRS7kq-SAMPLE-1",
  productName: "Energy Boost Sample",  // Cached for reporting
  
  sampledAt: "2025-11-12T10:30:00Z",
  
  // Attribution tracking
  attributionWindow: 30,            // From brand's settings
  expiresAt: "2025-12-12T10:30:00Z" // sampledAt + 30 days
}
```

---

## 4. Tier-Based Limits Summary

### Free Tier:
```typescript
{
  maxStoresPerMonth: 5,
  maxSampleProducts: 1,
  maxFullSizeProducts: 2,
  transactionFeePercent: 8.0,
  monthlyPlatformFee: 0
}
```

### Basic Tier ($99/mo):
```typescript
{
  maxStoresPerMonth: 50,
  maxSampleProducts: 3,
  maxFullSizeProducts: 6,
  transactionFeePercent: 6.0,
  monthlyPlatformFee: 99
}
```

### Pro Tier ($249/mo):
```typescript
{
  maxStoresPerMonth: 100,
  maxSampleProducts: 5,
  maxFullSizeProducts: 10,
  transactionFeePercent: 5.0,
  monthlyPlatformFee: 249
}
```

### Mega Tier ($499/mo):
```typescript
{
  maxStoresPerMonth: 250,
  maxSampleProducts: 10,
  maxFullSizeProducts: 20,
  transactionFeePercent: 4.0,
  monthlyPlatformFee: 499
}
```

---

## 5. Test Scenarios to Run

### Scenario 1: Create 2 Test Brands
```bash
# Free tier brand
npx tsx scripts/onboard-test-brand.ts --name "Wellness Co" --tier free --approve

# Pro tier brand
npx tsx scripts/onboard-test-brand.ts --name "Vita Labs" --tier pro --approve
```

### Scenario 2: Connect Both to Same Store
```bash
# Get your store ID first (check production or use existing)
npx tsx scripts/connect-brand-to-store.ts --brand ORG-WEL... --store STORE-XXX
npx tsx scripts/connect-brand-to-store.ts --brand ORG-VIT... --store STORE-XXX
```

### Scenario 3: Test Customer Daily Limit
1. Customer scans QR at display
2. Sees both brands' samples
3. Selects "Wellness Co - Energy Sample"
4. SampleHistory record created with `lastSampleDate = today`
5. Customer tries again same day → System blocks (1 sample per day limit)
6. Wait until next day → Can get sample from other brand

### Scenario 4: Test Store Brand Limits
```bash
# Free tier store can only have 1 brand partnership
# Try adding 2nd brand → Should fail with error message
```

### Scenario 5: Test Brand Store Limits
```bash
# Free tier brand can only add 5 stores per month
# Add 6th store → Should fail with "monthly limit reached" error
```

---

## 6. Viewing Test Data

### List all brands:
```bash
npx tsx scripts/list-multi-brand-data.ts
```

### View specific brand:
```bash
npx tsx scripts/list-multi-brand-data.ts --brand ORG-WEL123
```

### View store partnerships:
```bash
npx tsx scripts/list-multi-brand-data.ts --store STORE-ABC123
```

---

## 7. Quick Start Test Flow

```bash
# 1. Create test brands
npx tsx scripts/onboard-test-brand.ts --name "Test Brand A" --tier free --approve
npx tsx scripts/onboard-test-brand.ts --name "Test Brand B" --tier pro --approve

# 2. Note the ORG-XXX IDs from output

# 3. Connect to your existing store
npx tsx scripts/connect-brand-to-store.ts --brand ORG-XXX --store STORE-YYY

# 4. View the setup
npx tsx scripts/list-multi-brand-data.ts

# 5. Test customer flow in browser
# - Visit display URL
# - Fill out form
# - Select sample from Test Brand A
# - Check database for SampleHistory record

# 6. Test daily limit
# - Same customer tries again same day
# - Should see "You already received a sample today" message
```

---

## 8. Database Queries to Verify

### Check brand was created:
```sql
SELECT * FROM organizations WHERE type = 'client' ORDER BY "createdAt" DESC LIMIT 5;
```

### Check products created:
```sql
SELECT * FROM products WHERE "orgId" = 'clxxx...' ORDER BY category;
```

### Check partnership:
```sql
SELECT * FROM store_brand_partnerships WHERE "brandId" = 'clxxx...';
```

### Check sample history:
```sql
SELECT * FROM sample_history WHERE "brandId" = 'clxxx...' ORDER BY "sampledAt" DESC;
```

### Check customer daily limit:
```sql
SELECT phone, "lastSampleDate" FROM customers WHERE phone = '+15551234567';
```

---

## Notes

- **Production Safe**: All scripts run against `multi-brand-dev` database
- **Idempotent**: Running scripts twice won't duplicate data (will error if brand exists)
- **Realistic**: Test data uses real-world values and structures
- **Complete**: All required fields populated with sensible defaults
- **Traceable**: Clear SKU patterns (ORG-XXX-SAMPLE-1, etc.)
