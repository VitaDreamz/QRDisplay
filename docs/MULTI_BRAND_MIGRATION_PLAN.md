# Multi-Brand Architecture Migration Plan

**Branch:** `feature/multi-brand-architecture`  
**Status:** Schema Design Complete  
**Started:** November 9, 2025  
**Target Completion:** November 13-15, 2025

---

## Overview

This branch contains the multi-brand architecture that allows:
- **Platform (QRDisplay/SampleHound)** owns all stores and displays
- **Brands (VitaDreamz, etc.)** provide products and pay commissions
- **Stores** can partner with MULTIPLE brands simultaneously
- **Customers** can sample products from different brands at the same store
- **Commissions** are tracked per brand per sale

---

## Schema Changes (COMPLETED ✅)

### New Models Added:

#### 1. `StoreBrandPartnership` (Many-to-Many)
Links stores with brands they partner with.

```prisma
model StoreBrandPartnership {
  storeId             String
  brandId             String
  commissionRate      Float    @default(10.0)
  availableSamples    String[] // SKUs for this brand
  availableProducts   String[] // SKUs for this brand
  active              Boolean
  partnerSince        DateTime
}
```

**Purpose:** Store can have partnerships with VitaDreamz, Brand2, Brand3, etc.

#### 2. `SampleHistory`
Tracks which brand's products customers have sampled.

```prisma
model SampleHistory {
  customerId      String
  brandId         String
  storeId         String
  displayId       String?
  productSku      String
  sampledAt       DateTime
  attributionWindow Int @default(30)
  expiresAt       DateTime
}
```

**Purpose:** Attribution for commission tracking - "Did customer sample VitaDreamz or Brand2?"

### Modified Models:

#### `Store`
- Added `platformId` (will replace `orgId`)
- Added `brandPartnerships` relation
- Added `sampleHistory` relation
- Kept `orgId` for backwards compatibility during migration

#### `Organization`
- Added `brandPartnerships` relation
- Added `sampleHistory` relation

#### `Customer`
- Added `sampleHistory` relation

#### `Display`
- Added `sampleHistory` relation

---

## Migration Steps (TODO)

### Phase 1: Data Setup (Day 1)
- [ ] Create QRDisplay/SampleHound platform organization
- [ ] Migrate VitaDreamz from "client" to pure "brand"
- [ ] Create StoreBrandPartnership records for existing stores
- [ ] Populate SampleHistory from existing customer.sampleChoice data

### Phase 2: API Updates (Day 2)
- [ ] Update sample request flow to query partnerships
- [ ] Update webhook handler for multi-brand commission routing
- [ ] Update customer creation to track samples per brand
- [ ] Update display assignment (platform-owned, not brand-owned)

### Phase 3: Admin UI (Day 3)
- [ ] Add "Manage Brand Partnerships" page for stores
- [ ] Update product selection to show brand
- [ ] Update commission reports to break down by brand
- [ ] Add brand selector where needed

### Phase 4: Testing (Day 4)
- [ ] Create demo Brand #2 with fake products
- [ ] Test store with 2 brand partnerships
- [ ] Test sample request from each brand
- [ ] Test Shopify commission routing per brand
- [ ] Verify backward compatibility with existing data

---

## Backward Compatibility Strategy

### During Migration:
- Keep `Store.orgId` field (deprecated but functional)
- New code uses `Store.platformId`
- Migration script populates both fields
- Gradual cutover - no breaking changes

### After Migration:
- Once proven stable, remove old fields
- Clean up deprecated code paths
- Update documentation

---

## Testing Checklist

### Multi-Brand Scenarios:
- [ ] Store partners with VitaDreamz only
- [ ] Store partners with VitaDreamz + Brand2
- [ ] Customer samples VitaDreamz, buys VitaDreamz → commission to VitaDreamz
- [ ] Customer samples VitaDreamz, buys Brand2 → no commission (different brand)
- [ ] Customer samples Brand2, buys Brand2 → commission to Brand2
- [ ] Store shows only samples from partnered brands
- [ ] Webhook correctly identifies brand from order line items

### Backward Compatibility:
- [ ] Existing stores continue to work
- [ ] Existing customers can still request samples
- [ ] Existing commission tracking still functions
- [ ] No data loss during migration

---

## Rollback Plan

If issues arise:
1. Switch back to `main` branch
2. Main branch is untouched and production-ready
3. No data corruption (new tables are isolated)
4. Can retry migration after fixes

---

## Benefits of New Architecture

### Scalability:
- ✅ Add unlimited brands without code changes
- ✅ Each brand isolated (no cross-contamination)
- ✅ Stores choose which brands to partner with
- ✅ Platform owns all infrastructure

### Business Value:
- ✅ Can demo multi-brand to investors
- ✅ Truth in advertising ("multi-tenant from day 1")
- ✅ Easy to onboard new brands
- ✅ Stores can expand product offerings

### Technical:
- ✅ Proper database normalization
- ✅ Clear separation of concerns
- ✅ Scalable to 1000+ brands
- ✅ Commission routing per brand

---

## Current Status

**Schema:** ✅ Complete  
**Migration Scripts:** ⏳ Todo  
**API Updates:** ⏳ Todo  
**UI Updates:** ⏳ Todo  
**Testing:** ⏳ Todo  

---

## Next Steps

1. Create migration script to wipe test data
2. Create platform organization
3. Update sample request API
4. Update webhook handler
5. Test with demo brands
6. Deploy when ready

---

**DO NOT MERGE TO MAIN UNTIL FULLY TESTED**
