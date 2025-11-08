import prisma from '../lib/prisma';

/**
 * Script to add Shopify Product IDs and Variant IDs to existing products
 * 
 * This maintains your existing seeded products while adding Shopify integration
 * so that wholesale orders can use Shopify variant IDs.
 * 
 * USAGE:
 * 1. Get variant IDs from Shopify admin or API
 * 2. Update the mapping below with your actual Shopify IDs
 * 3. Run: npx tsx scripts/add-shopify-ids.ts
 */

// Shopify variant IDs from VitaDreamz Shopify store
const SHOPIFY_MAPPINGS = {
  // WHOLESALE BOXES - These have Shopify variant IDs and are used for draft orders
  'VD-SB-4-BX': {
    shopifyProductId: null, // Will be auto-extracted from variant
    shopifyVariantId: 'gid://shopify/ProductVariant/43894434234544',
  },
  'VD-SB-30-BX': {
    shopifyProductId: null,
    shopifyVariantId: 'gid://shopify/ProductVariant/43894424928432',
  },
  'VD-SB-60-BX': {
    shopifyProductId: null,
    shopifyVariantId: 'gid://shopify/ProductVariant/43894432989360',
  },
  'VD-BB-4-BX': {
    shopifyProductId: null,
    shopifyVariantId: 'gid://shopify/ProductVariant/44514733621424',
  },
  'VD-BB-30-BX': {
    shopifyProductId: null,
    shopifyVariantId: 'gid://shopify/ProductVariant/44514734637232',
  },
  'VD-BB-60-BX': {
    shopifyProductId: null,
    shopifyVariantId: 'gid://shopify/ProductVariant/44514738438320',
  },
  'VD-CC-4-BX': {
    shopifyProductId: null,
    shopifyVariantId: 'gid://shopify/ProductVariant/43911534182576',
  },
  'VD-CC-20-BX': {
    shopifyProductId: null,
    shopifyVariantId: 'gid://shopify/ProductVariant/43911533953200',
  },
  'VD-CC-60-BX': {
    shopifyProductId: null,
    shopifyVariantId: 'gid://shopify/ProductVariant/44744268251312',
  },
  
  // RETAIL PRODUCTS (30ct and 60ct bottles) - Not in Shopify yet, skip for now
  // Luna Berry products don't have Shopify IDs yet (empty in CSV)
  // These can be added later when they exist in Shopify
};

async function main() {
  console.log('🔗 Adding Shopify IDs to existing products...\n');

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [sku, shopifyIds] of Object.entries(SHOPIFY_MAPPINGS)) {
    // Skip if no variant ID provided
    if (!shopifyIds.shopifyVariantId) {
      console.log(`⏭️  Skipping ${sku} - no variant ID provided`);
      skipped++;
      continue;
    }

    try {
      const product = await prisma.product.findUnique({
        where: { sku }
      });

      if (!product) {
        console.log(`❌ Product not found: ${sku}`);
        notFound++;
        continue;
      }

      await prisma.product.update({
        where: { sku },
        data: {
          shopifyProductId: shopifyIds.shopifyProductId,
          shopifyVariantId: shopifyIds.shopifyVariantId,
        }
      });

      console.log(`✅ Updated ${sku} - ${product.name}`);
      updated++;
    } catch (error) {
      console.error(`❌ Error updating ${sku}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Not found: ${notFound}`);

  if (updated > 0) {
    console.log(`\n🎉 Success! ${updated} products now have Shopify variant IDs`);
    console.log(`   Wholesale orders will now use Shopify inventory tracking!`);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
