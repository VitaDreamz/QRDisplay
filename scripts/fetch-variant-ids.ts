import prisma from '../lib/prisma';
import { getShopifyClient } from '../lib/shopify';

/**
 * Script to fetch Shopify Variant IDs from Product IDs
 * 
 * This will query Shopify to get the correct variant IDs for each product,
 * then update our database with both product and variant IDs.
 * 
 * USAGE: npx tsx scripts/fetch-variant-ids.ts
 */

// Product IDs from your Shopify store
const PRODUCT_ID_MAPPINGS: Record<string, string> = {
  'VD-SB-4-BX': '7714981609648',
  'VD-SB-30-BX': '7714975514800',
  'VD-SB-60-BX': '7714980364464',
  'VD-BB-4-BX': '7872644219056',
  'VD-BB-30-BX': '7872644284592',
  'VD-BB-60-BX': '7872645202096',
  'VD-CC-4-BX': '7719687946416',
  'VD-CC-20-BX': '7719687782576',
  'VD-CC-60-BX': '7940841406640',
};

async function main() {
  console.log('🔍 Fetching variant IDs from Shopify...\n');

  // Get organization with Shopify credentials
  const org = await prisma.organization.findFirst({
    where: { 
      shopifyStoreName: { not: null },
      shopifyAccessToken: { not: null }
    }
  });

  if (!org || !org.shopifyStoreName || !org.shopifyAccessToken) {
    console.error('❌ No organization found with Shopify credentials');
    process.exit(1);
  }

  console.log(`✓ Using Shopify store: ${org.shopifyStoreName}\n`);

  const { shopify, session } = getShopifyClient(org);
  const client = new shopify.clients.Rest({ session });

  let updated = 0;
  let errors = 0;

  for (const [sku, productId] of Object.entries(PRODUCT_ID_MAPPINGS)) {
    try {
      console.log(`📦 Fetching ${sku} (Product ID: ${productId})...`);

      // Fetch product from Shopify
      const response = await client.get({
        path: `products/${productId}`,
      });

      const product = (response.body as any).product;

      if (!product) {
        console.log(`  ❌ Product not found in Shopify`);
        errors++;
        continue;
      }

      // Get the first variant (or could match by SKU if needed)
      const variant = product.variants?.[0];

      if (!variant) {
        console.log(`  ❌ No variants found for this product`);
        errors++;
        continue;
      }

      const variantId = variant.id.toString();
      const productGid = `gid://shopify/Product/${productId}`;
      const variantGid = `gid://shopify/ProductVariant/${variantId}`;

      console.log(`  ✓ Found variant ID: ${variantId}`);
      console.log(`  ✓ Title: ${product.title}`);
      console.log(`  ✓ Variant: ${variant.title}`);

      // Update database
      const dbProduct = await prisma.product.findUnique({
        where: { sku }
      });

      if (!dbProduct) {
        console.log(`  ⚠️  Product ${sku} not found in database`);
        continue;
      }

      await prisma.product.update({
        where: { sku },
        data: {
          shopifyProductId: productGid,
          shopifyVariantId: variantGid,
        }
      });

      console.log(`  ✅ Updated database with Product ID and Variant ID\n`);
      updated++;

    } catch (error: any) {
      console.error(`  ❌ Error processing ${sku}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ❌ Errors: ${errors}`);

  if (updated > 0) {
    console.log('\n🎉 Success! Products now have correct Shopify variant IDs');
  }

  await prisma.$disconnect();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
