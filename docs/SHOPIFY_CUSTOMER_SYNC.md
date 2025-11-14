# Shopify Customer Sync Strategy

## Overview
When a store is created in QRDisplay with brand partnerships, we need to ensure they have wholesale customer accounts in each brand's Shopify store.

## Flow

### 1. Store Creation
```
Admin creates store → Selects Brand A + Brand B partnerships → Submit
```

### 2. For Each Brand Partnership
```
For each brand:
  1. Search Shopify for existing customer by email (primary) or phone
  2. If found:
     - Update tags to include: subscription tier, state, city, storeId
     - Update metafields with QRDisplay data
     - Keep existing wholesale discount tier
  3. If not found:
     - Create new wholesale customer
     - Set tags: subscription tier, state, city, storeId
     - Set metafields
     - Apply default wholesale discount
```

## Shopify Customer Search Strategy

### Priority Order:
1. **Email match** (most reliable)
2. **Phone match** (secondary)
3. **Create new** (if no match)

### Why Email First?
- More unique than phone
- Required for Shopify login
- Less likely to change
- Better for notifications

## Tags Format
```
wholesale
tier:bronze | tier:silver | tier:gold
state:CA
city:Los Angeles
store:SID-003
qrdisplay:active
```

## Metafields (Custom Data)
```json
{
  "qrdisplay": {
    "storeId": "SID-003",
    "subscriptionTier": "bronze",
    "partnershipId": "partnership_123",
    "active": true,
    "lastSync": "2025-11-14T10:30:00Z"
  }
}
```

## Handling Duplicates

### Scenario 1: Email exists, different phone
**Action:** Update existing customer, add new phone as secondary

### Scenario 2: Phone exists, different email  
**Action:** Update existing customer, keep original email, note new email in notes

### Scenario 3: Both exist, different customers
**Action:** Flag for manual review, use email match, add note about phone conflict

### Scenario 4: Neither exists
**Action:** Create new customer with both

## Webhook Implementation

### After Store Creation Success
```typescript
// In /api/admin/stores/create/route.ts
for (const partnership of brandPartnerships) {
  const brand = await getBrandById(partnership.brandId);
  
  if (brand.shopifyStoreUrl && brand.shopifyAccessToken) {
    await syncStoreToShopify({
      brand,
      store,
      partnership,
      subscriptionTier: 'bronze' // default
    });
  }
}
```

### Sync Function
```typescript
async function syncStoreToShopify(params) {
  const { brand, store, partnership, subscriptionTier } = params;
  
  // 1. Search for existing customer
  const existing = await shopifySearchCustomer({
    email: store.ownerEmail,
    phone: store.ownerPhone,
    shopifyUrl: brand.shopifyStoreUrl,
    accessToken: brand.shopifyAccessToken
  });
  
  const tags = [
    'wholesale',
    `tier:${subscriptionTier}`,
    `state:${store.state}`,
    `city:${store.city}`,
    `store:${store.storeId}`,
    'qrdisplay:active'
  ].join(', ');
  
  const metafields = [
    {
      namespace: 'qrdisplay',
      key: 'store_id',
      value: store.storeId,
      type: 'single_line_text_field'
    },
    {
      namespace: 'qrdisplay',
      key: 'subscription_tier',
      value: subscriptionTier,
      type: 'single_line_text_field'
    }
  ];
  
  if (existing) {
    // 2a. Update existing customer
    await shopifyUpdateCustomer({
      customerId: existing.id,
      tags, // Merge with existing tags
      metafields,
      note: `QRDisplay Store: ${store.storeId} | Partnership created: ${new Date().toISOString()}`,
      shopifyUrl: brand.shopifyStoreUrl,
      accessToken: brand.shopifyAccessToken
    });
  } else {
    // 2b. Create new customer
    await shopifyCreateCustomer({
      email: store.ownerEmail,
      phone: store.ownerPhone,
      firstName: store.ownerName?.split(' ')[0] || store.storeName,
      lastName: store.ownerName?.split(' ').slice(1).join(' ') || '',
      tags,
      metafields,
      note: `QRDisplay Store: ${store.storeId} | Created: ${new Date().toISOString()}`,
      taxExempt: true, // Wholesale customers often tax exempt
      shopifyUrl: brand.shopifyStoreUrl,
      accessToken: brand.shopifyAccessToken
    });
  }
}
```

## Error Handling

### Brand Missing Shopify Credentials
- Log warning
- Continue with other brands
- Flag partnership as "sync pending"

### Shopify API Error
- Retry 3 times with exponential backoff
- If still fails: mark partnership as "sync failed"
- Send notification to admin
- Store sync job in queue for later retry

### Rate Limiting
- Shopify: 2 calls/second (REST API)
- Use queue system (Bull/BullMQ)
- Process brand syncs sequentially

## Future Enhancements

### 1. Bi-directional Sync
- Webhook from Shopify when customer updated
- Update QRDisplay store data

### 2. Order Tracking
- When Shopify order created with tags
- Link to QRDisplay store/staff for commission

### 3. Subscription Tier Changes
- When tier upgraded in QRDisplay
- Update discount tier in Shopify
- Re-sync tags

### 4. Multi-location Support
- Some stores have multiple locations
- Each location = separate Shopify customer?
- Or use metafields for location list?

## Implementation Priority

1. ✅ Basic customer search by email
2. ✅ Create/update with tags
3. ✅ Metafields for QRDisplay data
4. ⏳ Error handling & retry logic
5. ⏳ Queue system for async processing
6. ⏳ Webhook listeners for bi-directional sync
7. ⏳ Admin UI to view sync status
8. ⏳ Manual re-sync button

## Testing Strategy

### Test Cases:
1. New store, no existing Shopify customer → Create
2. Existing customer with email → Update tags
3. Existing customer with phone only → Update tags
4. Both email AND phone exist (different customers) → Use email match
5. Brand missing Shopify credentials → Skip gracefully
6. Shopify API error → Retry then fail gracefully
7. Multiple brand partnerships → Sync to all brands

### Test Data:
- Store: "Test Pharmacy"
- Email: test@pharmacy.com
- Phone: (555) 123-4567
- Brands: VitaDreamz Slumber, VitaDreamz Bliss
- Expected: 2 Shopify customer records (or updates)
