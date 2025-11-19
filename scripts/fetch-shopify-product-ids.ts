/**
 * Fetch Shopify Product IDs for variants
 * Uses the variant IDs to look up which product they belong to
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fetchProductIds() {
  console.log('\n🔍 Fetching Shopify Product IDs from variants...\n');

  // Get VitaDreamz Slumber brand with Shopify credentials
  const brand = await prisma.organization.findFirst({
    where: {
      orgId: 'ORG-VSCA1',
      shopifyStoreName: { not: null },
      shopifyAccessToken: { not: null }
    }
  });

  if (!brand || !brand.shopifyStoreName || !brand.shopifyAccessToken) {
    console.error('❌ VitaDreamz Slumber brand not found or Shopify not connected');
    return;
  }

  console.log(`✅ Using: ${brand.name} (${brand.shopifyStoreName})\n`);

  // Access token is already decrypted in the DB during this script's runtime
  // In production it's encrypted, but for scripts we can access it directly
  const accessToken = brand.shopifyAccessToken;

  // Get all products that have variant IDs but no product IDs
  const products = await prisma.product.findMany({
    where: {
      shopifyVariantId: { not: null },
      shopifyProductId: null
    },
    select: {
      id: true,
      sku: true,
      name: true,
      shopifyVariantId: true
    }
  });

  console.log(`📦 Found ${products.length} products with variant IDs but no product IDs\n`);

  let updated = 0;
  let errors = 0;

  for (const product of products) {
    try {
      // Extract numeric variant ID from GID
      const variantId = product.shopifyVariantId?.split('/').pop();
      
      if (!variantId) {
        console.log(`⚠️  ${product.sku} - Invalid variant ID format`);
        continue;
      }

      // Fetch variant details from Shopify to get product ID
      const response = await fetch(
        `https://${brand.shopifyStoreName}/admin/api/2024-01/variants/${variantId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.error(`❌ ${product.sku} - Failed to fetch variant: ${response.status}`);
        errors++;
        continue;
      }

      const data = await response.json();
      const productId = data.variant?.product_id;

      if (!productId) {
        console.error(`❌ ${product.sku} - No product_id in variant response`);
        errors++;
        continue;
      }

      const productGid = `gid://shopify/Product/${productId}`;
      const variantGid = `gid://shopify/ProductVariant/${variantId}`;

      // Update product with Product ID
      await prisma.product.update({
        where: { id: product.id },
        data: {
          shopifyProductId: productGid,
          shopifyVariantId: variantGid // Ensure it's in GID format
        }
      });

      console.log(`✅ ${product.sku}`);
      console.log(`   Product: ${productGid}`);
      console.log(`   Variant: ${variantGid}\n`);
      
      updated++;

    } catch (error) {
      console.error(`❌ Error processing ${product.sku}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  try {
    await fetchProductIds();
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
