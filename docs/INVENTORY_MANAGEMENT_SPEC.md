# Inventory Management Enhancement Spec

## Overview
Add automated wholesale order processing with incoming inventory tracking, low stock alerts, order tracking integration, and transaction history.

## Phase 1: Database Schema Updates

### 1.1 Add Incoming Inventory Field
```prisma
model StoreInventory {
  id              String   @id @default(cuid())
  storeId         String
  productSku      String
  
  quantityOnHand     Int @default(0)  // Physical inventory in store
  quantityIncoming   Int @default(0)  // 🆕 Ordered but not yet received
  quantityReserved   Int @default(0)  // Reserved for customer holds (2hr)
  quantityAvailable  Int @default(0)  // onHand - reserved (computed)
  
  lowStockThreshold  Int @default(10) // 🆕 Alert when onHand < this
  
  lastRestocked   DateTime?
  updatedAt       DateTime @updatedAt
  
  store   Store   @relation(fields: [storeId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productSku], references: [sku])
  
  incomingOrders IncomingInventoryOrder[] // 🆕 Track multiple incoming orders
  
  @@unique([storeId, productSku])
  @@index([storeId])
  @@map("store_inventory")
}
```

### 1.2 Add Incoming Order Tracking
```prisma
model IncomingInventoryOrder {
  id                String   @id @default(cuid())
  storeId           String
  productSku        String
  storeInventoryId  String
  
  shopifyOrderId    String   // Shopify order ID
  shopifyOrderNumber String  // Human-readable #1234
  
  quantityOrdered   Int      // Number of units ordered
  quantityReceived  Int @default(0) // Number actually received
  
  status            String @default("ordered") // ordered, shipped, in_transit, delivered, received
  
  // Tracking
  trackingNumber    String?
  carrier           String?
  trackingUrl       String?
  
  // Dates
  orderedAt         DateTime
  paidAt            DateTime?
  shippedAt         DateTime?
  estimatedDelivery DateTime?
  deliveredAt       DateTime?
  receivedAt        DateTime? // When store marks as received in system
  
  // Webhook data
  shopifyFulfillmentId String?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  storeInventory StoreInventory @relation(fields: [storeInventoryId], references: [id], onDelete: Cascade)
  
  @@index([storeId])
  @@index([shopifyOrderId])
  @@index([status])
  @@map("incoming_inventory_orders")
}
```

### 1.3 Update InventoryTransaction Types
Add new transaction types:
- `wholesale_ordered` - When wholesale order is placed (adds to incoming)
- `wholesale_shipped` - When order ships (tracking added)
- `wholesale_received` - When order arrives (moves incoming → onHand)
- `manual_adjustment` - Admin manual inventory correction

## Phase 2: Webhook Enhancement

### 2.1 Detect Wholesale Orders in Shopify Webhook

**File**: `/app/api/webhooks/shopify/orders/route.ts`

**New Function**: `handleWholesaleOrder()`

```typescript
async function handleWholesaleOrder(
  orgId: string, 
  order: ShopifyOrder, 
  topic: string
) {
  // 1. Check if order contains wholesale products (SKUs ending in -BX)
  const wholesaleItems = order.line_items.filter(item => 
    item.sku?.endsWith('-BX')
  );
  
  if (wholesaleItems.length === 0) return; // Not a wholesale order
  
  // 2. Find which store this order is for (via shopifyCustomerId)
  const store = await prisma.store.findFirst({
    where: { shopifyCustomerId: order.customer.id.toString() }
  });
  
  if (!store) {
    console.error('Store not found for wholesale order');
    return;
  }
  
  // 3. Process based on topic
  if (topic === 'orders/paid') {
    await handleWholesalePaid(store.id, order, wholesaleItems);
  } else if (topic === 'orders/fulfilled') {
    await handleWholesaleFulfilled(store.id, order, wholesaleItems);
  }
}

async function handleWholesalePaid(
  storeId: string,
  order: ShopifyOrder,
  wholesaleItems: LineItem[]
) {
  // Convert wholesale SKUs to retail SKUs and get quantities
  for (const item of wholesaleItems) {
    const retailSku = item.sku.replace(/-BX$/, '');
    const wholesaleProduct = await prisma.product.findUnique({
      where: { sku: item.sku }
    });
    
    if (!wholesaleProduct) continue;
    
    const unitsOrdered = item.quantity * (wholesaleProduct.unitsPerBox || 1);
    
    // Get or create store inventory
    let inventory = await prisma.storeInventory.findUnique({
      where: { storeId_productSku: { storeId, productSku: retailSku } }
    });
    
    if (!inventory) {
      inventory = await prisma.storeInventory.create({
        data: {
          storeId,
          productSku: retailSku,
          quantityOnHand: 0,
          quantityIncoming: unitsOrdered,
          quantityReserved: 0,
          quantityAvailable: 0
        }
      });
    } else {
      // Add to incoming
      await prisma.storeInventory.update({
        where: { id: inventory.id },
        data: {
          quantityIncoming: { increment: unitsOrdered }
        }
      });
    }
    
    // Create incoming order tracking
    await prisma.incomingInventoryOrder.create({
      data: {
        storeInventoryId: inventory.id,
        storeId,
        productSku: retailSku,
        shopifyOrderId: order.id.toString(),
        shopifyOrderNumber: order.order_number?.toString() || order.id.toString(),
        quantityOrdered: unitsOrdered,
        status: 'ordered',
        orderedAt: new Date(order.created_at),
        paidAt: new Date()
      }
    });
    
    // Create transaction log
    await prisma.inventoryTransaction.create({
      data: {
        storeId,
        productSku: retailSku,
        type: 'wholesale_ordered',
        quantity: unitsOrdered,
        balanceAfter: inventory.quantityOnHand,
        notes: `Wholesale order #${order.order_number} - ${item.quantity}x ${item.sku} (${unitsOrdered} units)`
      }
    });
  }
  
  // Notify store owner
  // TODO: Send email/SMS about incoming inventory
}

async function handleWholesaleFulfilled(
  storeId: string,
  order: ShopifyOrder,
  wholesaleItems: LineItem[]
) {
  // Get fulfillment data (tracking, carrier, etc.)
  const fulfillment = order.fulfillments?.[0];
  
  for (const item of wholesaleItems) {
    const retailSku = item.sku.replace(/-BX$/, '');
    
    // Update incoming order status
    await prisma.incomingInventoryOrder.updateMany({
      where: {
        storeId,
        productSku: retailSku,
        shopifyOrderId: order.id.toString(),
        status: { in: ['ordered', 'paid'] }
      },
      data: {
        status: 'shipped',
        shippedAt: new Date(),
        trackingNumber: fulfillment?.tracking_number,
        carrier: fulfillment?.tracking_company,
        trackingUrl: fulfillment?.tracking_url,
        estimatedDelivery: fulfillment?.estimated_delivery_at 
          ? new Date(fulfillment.estimated_delivery_at)
          : null
      }
    });
    
    // Create transaction log
    await prisma.inventoryTransaction.create({
      data: {
        storeId,
        productSku: retailSku,
        type: 'wholesale_shipped',
        quantity: 0, // No balance change yet
        balanceAfter: 0,
        notes: `Order shipped - Tracking: ${fulfillment?.tracking_number || 'N/A'}`
      }
    });
  }
  
  // Notify store owner with tracking info
  // TODO: Send email/SMS with tracking link
}
```

### 2.2 Manual "Mark as Received" Endpoint

**File**: `/app/api/store/inventory/receive/route.ts`

```typescript
// POST /api/store/inventory/receive
export async function POST(req: Request) {
  const { incomingOrderId } = await req.json();
  
  const incomingOrder = await prisma.incomingInventoryOrder.findUnique({
    where: { id: incomingOrderId },
    include: { storeInventory: true }
  });
  
  if (!incomingOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  
  // Move from incoming to onHand
  await prisma.storeInventory.update({
    where: { id: incomingOrder.storeInventoryId },
    data: {
      quantityIncoming: { decrement: incomingOrder.quantityOrdered },
      quantityOnHand: { increment: incomingOrder.quantityOrdered },
      quantityAvailable: { increment: incomingOrder.quantityOrdered },
      lastRestocked: new Date()
    }
  });
  
  // Mark order as received
  await prisma.incomingInventoryOrder.update({
    where: { id: incomingOrderId },
    data: {
      status: 'received',
      receivedAt: new Date(),
      quantityReceived: incomingOrder.quantityOrdered
    }
  });
  
  // Log transaction
  await prisma.inventoryTransaction.create({
    data: {
      storeId: incomingOrder.storeId,
      productSku: incomingOrder.productSku,
      type: 'wholesale_received',
      quantity: incomingOrder.quantityOrdered,
      balanceAfter: incomingOrder.storeInventory.quantityOnHand + incomingOrder.quantityOrdered,
      notes: `Received wholesale order #${incomingOrder.shopifyOrderNumber}`
    }
  });
  
  return NextResponse.json({ success: true });
}
```

## Phase 3: UI Implementation (Option C - Expandable Details)

### 3.1 Product Card with Expandable Inventory

```tsx
// Enhanced inventory display on product card
const [expandedInventory, setExpandedInventory] = useState<string | null>(null);

<button
  onClick={() => setExpandedInventory(
    expandedInventory === product.sku ? null : product.sku
  )}
  className="w-full mb-3 p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors group"
>
  {expandedInventory === product.sku ? (
    // EXPANDED VIEW
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase">Inventory</span>
        <svg className="w-4 h-4 text-gray-600" /* chevron up icon */ />
      </div>
      
      <div className="border-t border-gray-200 pt-3 space-y-2 text-left">
        {/* In Stock */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">🏪 In Stock:</span>
          <span className={`text-lg font-bold ${
            product.inventoryQuantity > product.lowStockThreshold 
              ? 'text-green-600' 
              : 'text-yellow-600'
          }`}>
            {product.inventoryQuantity || 0} units
          </span>
        </div>
        
        {/* Incoming */}
        {product.incomingOrders?.length > 0 && (
          <div className="bg-blue-50 rounded p-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-blue-900 font-semibold">📦 Incoming:</span>
              <span className="text-lg font-bold text-blue-600">
                +{product.incomingOrders.reduce((sum, o) => sum + o.quantityOrdered, 0)} units
              </span>
            </div>
            {product.incomingOrders.map(order => (
              <div key={order.id} className="text-xs text-blue-800 ml-4 mt-1">
                <div className="flex justify-between">
                  <span>└ Order #{order.shopifyOrderNumber}</span>
                  <StatusBadge status={order.status} />
                </div>
                {order.status === 'shipped' && order.estimatedDelivery && (
                  <div className="text-blue-600 ml-2">
                    ETA: {formatDate(order.estimatedDelivery)}
                  </div>
                )}
                {order.trackingNumber && (
                  <a 
                    href={order.trackingUrl || '#'} 
                    target="_blank"
                    className="text-blue-600 hover:underline ml-2"
                  >
                    Track: {order.trackingNumber}
                  </a>
                )}
                {order.status === 'delivered' && (
                  <button
                    onClick={() => markAsReceived(order.id)}
                    className="ml-2 mt-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    ✓ Mark as Received
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Reserved */}
        {product.quantityReserved > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">🔒 Reserved:</span>
            <span className="text-sm font-medium text-orange-600">
              {product.quantityReserved} units
            </span>
          </div>
        )}
        
        {/* Available */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <span className="text-sm font-semibold text-gray-700">✅ Available to Sell:</span>
          <span className="text-lg font-bold text-purple-600">
            {product.quantityAvailable || 0} units
          </span>
        </div>
        
        {/* Projected Total */}
        {product.incomingOrders?.length > 0 && (
          <div className="flex justify-between items-center bg-purple-50 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
            <span className="text-sm font-semibold text-purple-900">
              📊 Projected Total:
            </span>
            <span className="text-lg font-bold text-purple-700">
              {(product.inventoryQuantity || 0) + 
               product.incomingOrders.reduce((sum, o) => sum + o.quantityOrdered, 0)} units
            </span>
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openInventoryHistory(product.sku);
          }}
          className="flex-1 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded"
        >
          📋 History
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openReorderModal(product.sku);
          }}
          className="flex-1 py-1.5 text-xs bg-purple-600 text-white hover:bg-purple-700 rounded"
        >
          🔄 Reorder
        </button>
      </div>
    </div>
  ) : (
    // COLLAPSED VIEW
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase">Inventory</span>
        <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" /* chevron down */ />
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={`text-3xl font-bold ${
          product.inventoryQuantity > product.lowStockThreshold 
            ? 'text-green-600' 
            : product.inventoryQuantity > 0 
            ? 'text-yellow-600' 
            : 'text-red-600'
        }`}>
          {product.inventoryQuantity || 0}
        </span>
        <span className="text-sm text-gray-500">in stock</span>
        {product.incomingOrders?.length > 0 && (
          <span className="text-sm text-blue-600 font-medium">
            +{product.incomingOrders.reduce((sum, o) => sum + o.quantityOrdered, 0)} incoming
          </span>
        )}
      </div>
    </div>
  )}
</button>
```

### 3.2 Low Stock Badge

```tsx
// Add to product card header
{product.inventoryQuantity <= product.lowStockThreshold && 
 product.inventoryQuantity > 0 && (
  <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 flex items-center gap-1">
    ⚠️ Low Stock
  </div>
)}

{product.inventoryQuantity === 0 && (
  <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
    ❌ Out of Stock
  </div>
)}
```

### 3.3 Inventory History Modal

```tsx
const [inventoryHistoryProduct, setInventoryHistoryProduct] = useState<string | null>(null);
const [inventoryHistory, setInventoryHistory] = useState<any[]>([]);

// Fetch history
async function loadInventoryHistory(productSku: string) {
  const res = await fetch(`/api/store/inventory/history?productSku=${productSku}`);
  const data = await res.json();
  setInventoryHistory(data.transactions);
}

{inventoryHistoryProduct && (
  <Modal onClose={() => setInventoryHistoryProduct(null)}>
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">
        Inventory History - {products.find(p => p.sku === inventoryHistoryProduct)?.name}
      </h2>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {inventoryHistory.map(txn => (
          <div key={txn.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded">
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {formatTransactionType(txn.type)}
              </div>
              <div className="text-sm text-gray-600">{txn.notes}</div>
              <div className="text-xs text-gray-500">
                {formatDate(txn.createdAt)}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${
                txn.quantity > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {txn.quantity > 0 ? '+' : ''}{txn.quantity}
              </div>
              <div className="text-sm text-gray-500">
                Balance: {txn.balanceAfter}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Modal>
)}
```

## Phase 4: Dashboard Layout Migration (Optional)

### Shopify-Style Sidebar Layout

```tsx
// New structure: /app/store/dashboard/layout.tsx
<div className="flex h-screen bg-gray-100">
  {/* Sidebar */}
  <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
    <div className="p-4 border-b border-gray-200">
      <h1 className="font-bold text-xl">{storeName}</h1>
    </div>
    
    <nav className="flex-1 overflow-y-auto p-4">
      <NavSection title="Home" href="/store/dashboard" icon="🏠" />
      
      <NavSection title="Products" icon="📦">
        <NavItem href="/store/dashboard/products/inventory" label="Inventory" />
        <NavItem href="/store/dashboard/products/all" label="All Products" />
        <NavItem href="/store/dashboard/products/samples" label="Samples" />
      </NavSection>
      
      <NavSection title="Customers" icon="👥">
        <NavItem href="/store/dashboard/customers" label="All Customers" />
        <NavItem href="/store/dashboard/customers/pending" label="Pending" />
        <NavItem href="/store/dashboard/customers/active" label="Active" />
      </NavSection>
      
      <NavSection title="Orders" icon="📊">
        <NavItem href="/store/dashboard/orders" label="All Orders" />
        <NavItem href="/store/dashboard/orders/samples" label="Samples" />
        <NavItem href="/store/dashboard/orders/purchases" label="Purchases" />
      </NavSection>
      
      <NavSection title="Staff" href="/store/dashboard/staff" icon="👔" />
      <NavSection title="Settings" href="/store/dashboard/settings" icon="⚙️" />
    </nav>
  </aside>
  
  {/* Main Content */}
  <main className="flex-1 overflow-y-auto">
    {children}
  </main>
</div>
```

## Migration Effort Estimate

| Task | Effort | Priority |
|------|--------|----------|
| Database schema updates | 2-3 hours | High |
| Create migration | 1 hour | High |
| Webhook enhancements | 4-6 hours | High |
| API endpoints (receive, history) | 2-3 hours | High |
| UI: Expandable inventory (Option C) | 3-4 hours | High |
| UI: Low stock badges | 1 hour | Medium |
| UI: Inventory history modal | 2-3 hours | Medium |
| UI: Order tracking display | 2-3 hours | Medium |
| Shopify-style sidebar layout | 6-8 hours | Low |
| Route-based navigation migration | 4-6 hours | Low |
| Mobile responsive sidebar | 2-3 hours | Low |

**Total (without Shopify layout):** ~20-25 hours
**Total (with Shopify layout):** ~32-40 hours

## Recommendation

1. **Phase 1-3 First** (inventory features) - Higher ROI, solves immediate pain points
2. **Phase 4 Later** (layout migration) - Nice-to-have, can be done incrementally

The inventory features will provide immediate value. The Shopify-style layout is a good idea for future scalability but not urgent.
