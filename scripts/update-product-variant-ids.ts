/**
 * Update existing products with Shopify Variant IDs
 * Uses the variant IDs you provided from VitaDreamz Shopify store
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of products with their Shopify Variant IDs
const productVariants = [
  // Slumber Berry (VitaDreamz Slumber)
  {
    sku: 'VD-SB-4-BX',
    shopifyProductId: 'gid://shopify/Product/7234567890', // Will be fetched from Shopify
    shopifyVariantId: 'gid://shopify/ProductVariant/43894434234544',
  },
  {
    sku: 'VD-SB-30-BX',
    shopifyProductId: 'gid://shopify/Product/7234567890',
    shopifyVariantId: 'gid://shopify/ProductVariant/43894424928432',
  },
  {
    sku: 'VD-SB-60-BX',
    shopifyProductId: 'gid://shopify/Product/7234567890',
    shopifyVariantId: 'gid://shopify/ProductVariant/43894432989360',
  },
  
  // Bliss Berry (VitaDreamz Bliss)
  {
    sku: 'VD-BB-4-BX',
    shopifyProductId: 'gid://shopify/Product/7234567890',
    shopifyVariantId: 'gid://shopify/ProductVariant/44514733621424',
  },
  {
    sku: 'VD-BB-30-BX',
    shopifyProductId: 'gid://shopify/Product/7234567890',
    shopifyVariantId: 'gid://shopify/ProductVariant/44514734637232',
  },
  {
    sku: 'VD-BB-60-BX',
    shopifyProductId: 'gid://shopify/Product/7234567890',
    shopifyVariantId: 'gid://shopify/ProductVariant/44514738438320',
  },
  
  // ChillOut Chewz (VitaDreamz Chill)
  {
    sku: 'VD-CC-4-BX',
    shopifyProductId: 'gid://shopify/Product/7234567890',
    shopifyVariantId: 'gid://shopify/ProductVariant/43911534182576',
  },
  {
    sku: 'VD-CC-20-BX',
    shopifyProductId: 'gid://shopify/Product/7234567890',
    shopifyVariantId: 'gid://shopify/ProductVariant/43911533953200',
  },
  {
    sku: 'VD-CC-60-BX',
    shopifyProductId: 'gid://shopify/Product/7234567890',
    shopifyVariantId: 'gid://shopify/ProductVariant/44744268251312',
  },
];

async function updateProductVariants() {
  console.log('\n📦 Updating products with Shopify Variant IDs...\n');

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const variant of productVariants) {
    try {
      const product = await prisma.product.findUnique({
        where: { sku: variant.sku },
        select: { id: true, sku: true, name: true, shopifyVariantId: true }
      });

      if (!product) {
        console.log(`⚠️  Product not found: ${variant.sku}`);
        notFound++;
        continue;
      }

      if (product.shopifyVariantId === variant.shopifyVariantId) {
        console.log(`✓ ${variant.sku} - Already has correct variant ID`);
        continue;
      }

      await prisma.product.update({
        where: { sku: variant.sku },
        data: {
          shopifyVariantId: variant.shopifyVariantId,
        }
      });

      console.log(`✅ ${variant.sku} - Updated with variant ID: ${variant.shopifyVariantId}`);
      updated++;

    } catch (error) {
      console.error(`❌ Error updating ${variant.sku}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Not Found: ${notFound}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(60) + '\n');

  if (notFound > 0) {
    console.log('💡 Products not found need to be created first.');
    console.log('   Run: npx tsx scripts/add-wholesale-products.ts\n');
  }
}

async function main() {
  try {
    await updateProductVariants();
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
