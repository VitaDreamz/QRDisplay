
### December 3, 2025 - Brand Dashboard Stores Tab & Products Tab Improvements

**Goal:** Build the Brand Dashboard Stores Tab (matching StoreBrandsTab pattern) and improve Products Tab ordering

**Completed:**

1. ✅ Created `BrandStoresTab.tsx` Component (935 lines)
   - **Section 1: Pending Requests** - Shows both incoming (store→brand) and outgoing (brand→store) requests
   - **Section 2: Current Partnerships** - Expandable store cards with stats, contacts, address
   - **Section 3: Available Stores** - Multi-select with "Send Request" modal
   - Plan info badge showing tier limits (maxStores)
   - Respects brand tier limits from `lib/brand-tiers.ts`

2. ✅ Created API Endpoints for Brand Store Management
   - `GET /api/brand/[orgId]/stores/available` - Returns stores not partnered with this brand
   - `GET /api/brand/[orgId]/stores/requests` - Returns pending partnership requests
   - `POST /api/brand/[orgId]/stores/requests` - Creates new partnership requests (with tier limit checks)
   - `PATCH /api/brand/[orgId]/stores/requests/[requestId]` - Accept/decline incoming requests
   - `DELETE /api/brand/[orgId]/stores/requests/[requestId]` - Cancel outgoing requests

3. ✅ Updated `page.tsx` with Expanded Store Data
   - Added `storeLogoUrl`, `address2`, `purchasingManager`, `purchasingPhone`, `purchasingEmail`
   - Added `subscriptionTier` and customer count via `_count`

4. ✅ Updated `BrandDashboardClient.tsx`
   - Import and use `BrandStoresTab` component
   - Pass required props: `orgId`, `brandId`, `tier`, `storePartnerships`, `onRefresh`

5. ✅ Products Tab Improvements
   - Added `naturalSortBy` for proper numeric ordering (4ct < 30ct < 60ct)
   - Removed "Other Products" section
   - Final section order: **Samples → Full-Size Products → Wholesale**

6. ✅ Removed Incorrect "In-Store" Commission Rate
   - Removed `commissionRate` display from BrandStoresTab (was showing 10% in-store commission that doesn't exist)
   - Commission rates now only show: Promo, Online, Subscription

**Key Commits:**

- `a48b271` - feat: Add Brand Dashboard Stores Tab with full partnership management
- `c936a0c` - fix: Products tab - natural sort and remove Other Products section

**Files Created:**

- `app/brand/[orgId]/dashboard/components/BrandStoresTab.tsx` (935 lines)
- `app/api/brand/[orgId]/stores/available/route.ts`
- `app/api/brand/[orgId]/stores/requests/route.ts`
- `app/api/brand/[orgId]/stores/requests/[requestId]/route.ts`

**Files Modified:**

- `app/brand/[orgId]/dashboard/BrandDashboardClient.tsx` - Import BrandStoresTab, add naturalSortBy
- `app/brand/[orgId]/dashboard/page.tsx` - Expanded storePartnerships query

**Result:** Brand Dashboard now has a fully functional Stores Tab matching the StoreBrandsTab pattern, with proper tier limits and partnership request management. Products Tab displays in correct order with natural sorting.

---
