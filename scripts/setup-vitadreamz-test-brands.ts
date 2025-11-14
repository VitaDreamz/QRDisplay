/**
 * Setup 3 VitaDreamz "brands" for multi-brand testing
 * Each brand represents one flavor line (Slumber, Bliss, Chill)
 * All connected to the same Shopify store
 */

import prisma from '../lib/prisma';

const SHOPIFY_STORE = 'vitadreamz.myshopify.com';

// Generate unique org ID
function generateOrgId(name: string): string {
  const prefix = name
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORG-${prefix}${random}`;
}

// Brand configurations with real VitaDreamz SKUs
const brands = [
  {
    name: 'VitaDreamz Slumber',
    slug: 'vitadreamz-slumber',
    description: 'Premium CBD + Melatonin Sleep Gummies',
    category: 'Sleep',
    sampleProduct: {
      sku: 'VD-SB-4',
      name: '4ct - Slumber Berry - Sleep Gummies',
      price: 4.99,
      description: 'CBD + Melatonin & Herbals',
      imageUrl: '/images/products/4ct-SlumberBerry-Bag.png',
    },
    fullSizeProducts: [
      {
        sku: 'VD-SB-30',
        name: '30ct - Slumber Berry - Sleep Gummies',
        price: 29.99,
        description: 'CBD + Melatonin & Herbals',
        imageUrl: '/images/products/30ct-SlumberBerry-Bag.png',
      },
      {
        sku: 'VD-SB-60',
        name: '60ct - Slumber Berry - Sleep Gummies',
        price: 54.99,
        description: 'CBD + Melatonin & Herbals',
        imageUrl: '/images/products/60ct-SlumberBerry-Bag.png',
      },
    ],
  },
  {
    name: 'VitaDreamz Bliss',
    slug: 'vitadreamz-bliss',
    description: 'Magnesium + Herbals Relax & Sleep Gummies',
    category: 'Sleep',
    sampleProduct: {
      sku: 'VD-BB-4',
      name: '4ct - Bliss Berry - Relax & Sleep Gummies',
      price: 4.99,
      description: 'Magnesium + Herbals',
      imageUrl: '/images/products/4ct-BlissBerry-Bag.png',
    },
    fullSizeProducts: [
      {
        sku: 'VD-BB-30',
        name: '30ct - Bliss Berry - Relax & Sleep Gummies',
        price: 24.99,
        description: 'Magnesium + Herbals',
        imageUrl: '/images/products/30ct-BlissBerry-Bag.png',
      },
      {
        sku: 'VD-BB-60',
        name: '60ct - Bliss Berry - Relax & Sleep Gummies',
        price: 44.99,
        description: 'Magnesium + Herbals',
        imageUrl: '/images/products/60ct-BlissBerry-Bag.png',
      },
    ],
  },
  {
    name: 'VitaDreamz Chill',
    slug: 'vitadreamz-chill',
    description: 'D9 THC + Herbals ChillOut Chewz',
    category: 'Relax',
    sampleProduct: {
      sku: 'VD-CC-4',
      name: '4ct - Berry Chill - ChillOut Chewz',
      price: 5.99,
      description: 'D9 THC + Herbals',
      imageUrl: '/images/products/4ct-Chillout-Bag.png',
    },
    fullSizeProducts: [
      {
        sku: 'VD-CC-20',
        name: '20ct - Berry Chill - ChillOut Chewz',
        price: 24.95,
        description: 'D9 THC + Herbals',
        imageUrl: '/images/products/20ct-ChillOut Chewz-Bag.png',
      },
      {
        sku: 'VD-CC-60',
        name: '60ct - Berry Chill - ChillOut Chewz',
        price: 59.99,
        description: 'D9 THC + Herbals',
        imageUrl: '/images/products/60ct-ChillOutChewz-Bag.png',
      },
    ],
  },
];

async function main() {
  console.log('🌟 Setting up 3 VitaDreamz test brands...\n');

  for (const brandConfig of brands) {
    console.log(`\n📦 Creating brand: ${brandConfig.name}`);
    
    // Generate unique org ID
    const orgId = generateOrgId(brandConfig.name);
    
    // Create organization (brand)
    const org = await prisma.organization.create({
      data: {
        orgId,
        name: brandConfig.name,
        slug: brandConfig.slug,
        type: 'client',
        supportEmail: `${brandConfig.slug}@vitadreamz.com`,
        brandTier: 'free',
        maxStoresPerMonth: 5,
        maxSampleProducts: 1,
        maxFullSizeProducts: 2,
        transactionFeePercent: 6.0,
        monthlyPlatformFee: 0,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        shopifyStoreName: SHOPIFY_STORE,
      },
    });

    console.log(`   ✅ Created organization: ${org.orgId}`);

    // Create sample product
    const sample = await prisma.product.create({
      data: {
        ...brandConfig.sampleProduct,
        orgId: org.orgId,
        category: brandConfig.category,
        active: true,
      },
    });

    console.log(`   ✅ Created sample: ${sample.sku}`);

    // Create full-size products
    for (const productData of brandConfig.fullSizeProducts) {
      const product = await prisma.product.create({
        data: {
          ...productData,
          orgId: org.orgId,
          category: brandConfig.category,
          active: true,
        },
      });

      console.log(`   ✅ Created product: ${product.sku}`);
    }

    console.log(`   🎉 Brand ${brandConfig.name} setup complete!`);
  }

  console.log('\n\n✨ All 3 VitaDreamz test brands created successfully!\n');
  console.log('📋 Summary:');
  console.log('   - VitaDreamz Slumber (Sleep - CBD + Melatonin)');
  console.log('   - VitaDreamz Bliss (Sleep - Magnesium + Herbals)');
  console.log('   - VitaDreamz Chill (Relax - D9 THC + Herbals)');
  console.log('\nNext steps:');
  console.log('   1. Find your test store ID');
  console.log('   2. Connect these brands to your store using connect-brand-to-store.ts');
  console.log('   3. Start building Sprint 1 (customer brand selection UI)\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
