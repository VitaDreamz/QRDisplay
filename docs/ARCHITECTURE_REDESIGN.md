# Architecture Redesign: Multi-Brand Platform

## Current Problems

1. **Stores belong to ONE organization** (`Store.orgId`)
   - Can't carry products from multiple brands
   - Wrong hierarchy (stores "owned by" brands)

2. **Products are not modeled as entities**
   - SKUs stored as strings in arrays
   - No brand association
   - No pricing, inventory, or metadata

3. **Commissions only work for one brand per store**
   - Webhook looks up org by store's orgId
   - Can't track which brand's products were purchased

## Desired Architecture

### Tier 1: Platform (QRDisplay/Sample Hound)
- Owns all displays
- Owns all stores
- Manages the platform
- Single organization: `type: 'platform'`

### Tier 2: Brands (VitaDreamz, FutureBrand, etc.)
- Organizations with `type: 'brand'`
- Each has Shopify store
- Provides products/samples
- Pays commissions to stores

### Tier 3: Stores
- Independent businesses
- Belong to platform (not brands)
- Can carry products from MULTIPLE brands
- Earn commissions from each brand

## Required Schema Changes

### 1. Fix Store Ownership
```prisma
model Store {
  // OLD: belongs to brand
  orgId String // ❌ References brand
  
  // NEW: belongs to platform
  platformId String // ✅ References platform org
  organization Organization @relation("PlatformStores", fields: [platformId], references: [id])
}
```

### 2. Create Product Model
```prisma
model Product {
  id          String @id @default(cuid())
  sku         String @unique
  brandId     String // References brand organization
  brand       Organization @relation(fields: [brandId], references: [id])
  
  name        String
  description String?
  category    String // 'sample', 'retail', 'wholesale'
  
  // Pricing
  retailPrice     Decimal?
  wholesalePrice  Decimal?
  sampleSize      String? // "4-pack", "1oz", etc.
  
  // Shopify integration
  shopifyProductId String?
  shopifyVariantId String?
  
  active      Boolean @default(true)
  createdAt   DateTime @default(now())
}
```

### 3. Create Store-Brand Relationships (Many-to-Many)
```prisma
model StoreBrandPartnership {
  id          String @id @default(cuid())
  storeId     String
  brandId     String
  
  store       Store @relation(fields: [storeId], references: [id])
  brand       Organization @relation("BrandPartnerships", fields: [brandId], references: [id])
  
  // Store-specific settings per brand
  commissionRate          Float @default(10.0)
  availableSamples        String[] // SKUs this store carries for this brand
  availableProducts       String[] // SKUs this store can sell
  active                  Boolean @default(true)
  
  partnerSince            DateTime @default(now())
  
  @@unique([storeId, brandId])
}
```

### 4. Fix Customer Attribution
```prisma
model Customer {
  // OLD: belongs to one org (brand)
  orgId String
  
  // NEW: belongs to store, can buy from any brand
  storeId String
  store   Store @relation(fields: [storeId], references: [id])
  
  // Track which brand(s) they've sampled
  sampleHistory SampleHistory[]
}

model SampleHistory {
  id          String @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  
  brandId     String
  brand       Organization @relation(fields: [brandId], references: [id])
  
  productSku  String
  sampledAt   DateTime @default(now())
  displayId   String?
}
```

### 5. Fix Conversion Tracking
```prisma
model Conversion {
  // Track which brand's product was purchased
  brandId     String
  brand       Organization @relation(fields: [brandId], references: [id])
  
  storeId     String
  store       Store @relation(fields: [storeId], references: [id])
  
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  
  productSku  String
  commission  Decimal // Paid TO the store BY the brand
}
```

## Migration Strategy

### Phase 1: Add New Models (Non-Breaking)
1. Create `Product` model
2. Create `StoreBrandPartnership` model  
3. Create `SampleHistory` model
4. Migrate existing SKU strings to Product records

### Phase 2: Dual-Write Period
1. Keep old `Store.orgId` field
2. Add new `Store.platformId` field
3. Write to both during transition

### Phase 3: Update Application Logic
1. Update webhook handler to determine brand from order line items
2. Update sample request flow to track brand
3. Update commission calculation per brand

### Phase 4: Remove Old Fields
1. Drop `Store.orgId` (brand ownership)
2. Drop `Store.availableSamples` (move to StoreBrandPartnership)
3. Drop `Store.availableProducts` (move to StoreBrandPartnership)

## Benefits

✅ Stores can carry products from multiple brands
✅ Each brand has its own Shopify store for commissions
✅ Proper product catalog with pricing, metadata
✅ Clear attribution: which brand's product converted
✅ Scalable to 10, 100, 1000 brands
✅ Stores choose which brands to partner with

## Example Data Flow

### Store Setup:
```
Store "Nature's Elite" (SID-001)
├─ platformId: QRDisplay
├─ Partnerships:
│   ├─ VitaDreamz (10% commission)
│   │   └─ Samples: [VD-SB-4, VD-BB-4]
│   └─ FutureBrand (15% commission)
│       └─ Samples: [FB-XXX-1]
```

### Customer Journey:
```
1. Customer scans QR at Nature's Elite
2. Selects VitaDreamz sample (VD-SB-4)
3. Customer record created:
   - storeId: SID-001
   - SampleHistory: VitaDreamz, VD-SB-4
   
4. Customer buys from VitaDreamz Shopify
5. Webhook → finds brand (VitaDreamz)
6. Checks customer's sample history → matches!
7. Creates conversion:
   - brandId: VitaDreamz
   - storeId: SID-001
   - commission: $2.75 (10% of $27.50)
8. Credits Nature's Elite store credit
```

## Decision Required

Should we implement this redesign? This is a **fundamental architecture change** but is necessary for the multi-brand platform vision.

**Effort:** ~2-3 days of development + testing
**Risk:** Medium (requires data migration)
**Benefit:** Unlocks true multi-brand platform capabilities
