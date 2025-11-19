# Shopify Product Import & Wholesale Order Tracking Guide

## Overview

The system now supports **intelligent product matching** for wholesale orders using Shopify Product/Variant IDs instead of requiring specific SKU naming conventions.

## How It Works

### 1. Product Import Flow (Brand Side)

When a brand connects their Shopify store, they can import products via:

**URL:** `/admin/brands/[orgId]/import-products`

**Process:**
1. Fetches all products from brand's Shopify store
2. Brand selects which products to import as:
   - **Sample** (4ct, trial sizes)
   - **Retail** (full-size for customer purchases)
   - **Wholesale** (boxes/cases for store ordering)
3. System stores `shopifyProductId` and `shopifyVariantId` with each product
4. Brand can assign custom SKUs or use auto-generated ones

### 2. Wholesale Order Detection (Webhook)

When a Shopify order comes in via webhook, the system uses **3-tier matching**:

#### Method 1: Variant ID Match (BEST)
```typescript
shopifyVariantId: "gid://shopify/ProductVariant/43894434234544"
```
- Most accurate
- Works even if SKU changes
- Recommended approach

#### Method 2: Product ID Match (GOOD)
```typescript
shopifyProductId: "gid://shopify/Product/7234567890"
```
- Less specific (matches all variants)
- Fallback if variant ID not available

#### Method 3: SKU Match (LEGACY)
```typescript
sku: "VD-SB-30-BX"
```
- Old system - still works
- SKU must end in `-BX` for wholesale products
- Only used if Shopify IDs not found

### 3. Inventory Tracking

**Wholesale → Retail Conversion:**
1. System finds wholesale product by Shopify ID
2. Checks `unitsPerBox` field (e.g., 30 for a 30ct box)
3. Converts to retail SKU (removes `-BX` suffix)
4. Updates `storeInventory.quantityIncoming`

**Example:**
- Order: 2x "30ct Sleep Gummies Box" (wholesale)
- Shopify Variant ID: `gid://shopify/ProductVariant/12345`
- Matched Product: `VD-SB-30-BX` with `unitsPerBox: 30`
- Result: 60 units of `VD-SB-30` (retail) added to incoming

## Setup Instructions

### For Brands:

1. **Connect Shopify** (if not already done)
   - Ensure `shopifyStoreName` and `shopifyAccessToken` are set
   - Run: `npx tsx scripts/add-shopify-to-brands.js`

2. **Import Products**
   - Go to: `/admin/brands/[orgId]/import-products`
   - Select products from your Shopify store
   - Categorize as Sample/Retail/Wholesale
   - System automatically saves Shopify IDs

3. **Set unitsPerBox**
   - For wholesale products, ensure `unitsPerBox` is set
   - Example: 30ct box = `unitsPerBox: 30`

### For Stores:

1. **Create Store with Brand Partnerships**
   - System automatically creates Shopify customer account
   - Customer name: `[Store Name] / Wholesale`
   - Tags: `qrdisplay`, `wholesale`, `wg_wholesale`, `SID-XXX`

2. **Place Wholesale Orders**
   - Use `/store/wholesale` page
   - Order creates draft order in Shopify
   - Invoice emailed to purchasing contact

3. **Track Incoming Inventory**
   - When order paid → webhook triggers
   - Inventory automatically updated
   - View in store dashboard

## Product Data Structure

```typescript
{
  sku: "VD-SB-30-BX",           // Internal SKU (can be anything)
  shopifyProductId: "gid://shopify/Product/7234567890",
  shopifyVariantId: "gid://shopify/ProductVariant/43894434234544",
  unitsPerBox: 30,               // For wholesale products only
  orgId: "brand-id",             // Which brand owns this
  category: "wholesale",         // sample | retail | wholesale
}
```

## Advantages of This System

✅ **No SKU Naming Requirements**
- Your Shopify SKUs can be anything (`30ctBxSPSB`, `FULLBX-WS`, etc.)
- System matches by Shopify IDs, not SKU patterns

✅ **Survives SKU Changes**
- Even if you update SKUs in Shopify, orders still match
- Shopify IDs are permanent

✅ **Multi-Variant Support**
- Can have different wholesale sizes
- Each variant tracked separately

✅ **Backwards Compatible**
- Still supports old `-BX` SKU matching
- Gradual migration path

## Migration Path

### If you have OLD products (SKU-based):
They will continue to work via Method 3 (SKU matching)

### To migrate to NEW system:
1. Go to `/admin/brands/[orgId]/import-products`
2. Re-import products from Shopify
3. System will add Shopify IDs to existing products
4. Future orders will use Method 1 (Variant ID)

## Troubleshooting

**Problem:** Order not detected as wholesale
- Check if product has `shopifyVariantId` OR `shopifyProductId` set
- Verify `unitsPerBox` is not null
- Check product belongs to correct brand (`orgId`)

**Problem:** Inventory not updating
- Check webhook logs in `/api/webhooks/shopify/orders`
- Ensure retail product exists (SKU without `-BX`)
- Verify store has `shopifyCustomerId` set

**Problem:** Can't find products in import
- Verify brand's `shopifyStoreName` and `shopifyAccessToken`
- Check Shopify API credentials
- Ensure products are active in Shopify

## Next Steps

1. **Import your existing Shopify products** via the import page
2. **Test a wholesale order** with a test store
3. **Verify inventory updates** in store dashboard
4. **Clean up old customer accounts** if needed (separate script)

---

**Related Files:**
- `/app/admin/brands/[orgId]/import-products/page.tsx` - Import UI
- `/app/api/admin/shopify/import-products/route.ts` - Import API
- `/app/api/webhooks/shopify/orders/route.ts` - Order webhook (updated)
- `/lib/shopify-wholesale-sync.ts` - Customer sync
