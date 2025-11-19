import prisma from '../lib/prisma';
import { getShopifyRestClient } from '../lib/shopify';

/**
 * Update all existing store customers in Shopify with correct tags
 * Adds: wg_wholesale and {storeId} tags
 */
async function updateExistingStoreCustomers() {
  console.log('🔄 Updating all existing store customers in Shopify...\n');

  // Get all stores with brand partnerships
  const stores = await prisma.store.findMany({
    where: {
      shopifyCustomerId: { not: null }, // Only stores that have been synced to Shopify
    },
    include: {
      brandPartnerships: {
        where: { status: 'active' },
        include: {
          brand: {
            select: {
              orgId: true,
              name: true,
              shopifyStoreName: true,
              shopifyAccessToken: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${stores.length} stores to update\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const store of stores) {
    console.log(`\n🏪 ${store.storeName} (${store.storeId})`);
    console.log(`   Shopify Customer ID: ${store.shopifyCustomerId}`);

    // Update customer in each brand's Shopify store
    for (const partnership of store.brandPartnerships) {
      const brand = partnership.brand;

      if (!brand.shopifyStoreName || !brand.shopifyAccessToken) {
        console.log(`   ⊘ ${brand.name}: No Shopify connection`);
        totalSkipped++;
        continue;
      }

      try {
        const restClient = await getShopifyRestClient(brand);

        // Search for customer by storeId in note/tags
        const searchResponse = await restClient.get({
          path: 'customers/search',
          query: { query: `tag:qrdisplay-store:${store.storeId}` },
        });

        const customers = (searchResponse.body as any).customers || [];

        if (customers.length === 0) {
          console.log(`   ⚠️  ${brand.name}: Customer not found with tag qrdisplay-store:${store.storeId}`);
          totalSkipped++;
          continue;
        }

        const customer = customers[0];
        const existingTags = customer.tags ? customer.tags.split(',').map((t: string) => t.trim()) : [];

        // Build new tag list with all required tags
        const requiredTags = [
          'qrdisplay',
          'wholesale',
          'wg_wholesale',
          store.storeId,
          `qrdisplay-store:${store.storeId}`,
        ];

        // Merge existing tags with required tags (preserve other tags)
        const newTags = [...new Set([...existingTags, ...requiredTags])];

        // Only update if tags changed
        const tagsChanged = JSON.stringify(existingTags.sort()) !== JSON.stringify(newTags.sort());

        if (!tagsChanged) {
          console.log(`   ✓ ${brand.name}: Tags already correct`);
          totalSkipped++;
          continue;
        }

        // Update customer tags
        await restClient.put({
          path: `customers/${customer.id}`,
          data: {
            customer: {
              id: customer.id,
              tags: newTags.join(', '),
            },
          },
        });

        console.log(`   ✅ ${brand.name}: Updated tags`);
        console.log(`      Old: ${existingTags.join(', ')}`);
        console.log(`      New: ${newTags.join(', ')}`);
        totalUpdated++;
      } catch (error) {
        console.error(`   ❌ ${brand.name}: Error updating customer`, error);
        totalErrors++;
      }
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`   ✅ Updated: ${totalUpdated}`);
  console.log(`   ⊘ Skipped: ${totalSkipped}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
}

updateExistingStoreCustomers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
