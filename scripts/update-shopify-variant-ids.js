const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Shopify Variant IDs from the CSV
const variantIds = {
  'VD-SB-4-BX': '43894434234544',
  'VD-SB-30-BX': '43894424928432',
  'VD-SB-60-BX': '43894432989360',
  'VD-BB-4-BX': '44514733621424',
  'VD-BB-30-BX': '44514734637232',
  'VD-BB-60-BX': '44514738438320',
  'VD-CC-4-BX': '43911534182576',
  'VD-CC-20-BX': '43911533953200',
  'VD-CC-60-BX': '44744268251312',
};

async function updateVariantIds() {
  console.log('🔄 Updating Shopify Variant IDs for wholesale products...\n');

  for (const [sku, variantId] of Object.entries(variantIds)) {
    const product = await prisma.product.findUnique({
      where: { sku },
      select: { id: true, name: true, shopifyVariantId: true },
    });

    if (!product) {
      console.log(`⚠️  Product ${sku} not found in database - skipping`);
      continue;
    }

    if (product.shopifyVariantId === variantId) {
      console.log(`✓ ${sku}: Already has correct variant ID`);
      continue;
    }

    await prisma.product.update({
      where: { sku },
      data: {
        shopifyVariantId: variantId,
      },
    });

    console.log(`✅ ${sku}: Updated variant ID to ${variantId}`);
    console.log(`   Product: ${product.name}`);
  }

  console.log('\n✨ Done! All variant IDs updated.');
  await prisma.$disconnect();
}

updateVariantIds().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
