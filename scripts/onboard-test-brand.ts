#!/usr/bin/env tsx
/**
 * Manual Test Brand Onboarding Script
 * 
 * Creates a fully configured test brand organization with:
 * - Organization record (type='client')
 * - Sample products (3 SKUs)
 * - Full-size products (2 SKUs)
 * - Shopify integration fields
 * - Subscription tier settings
 * 
 * Usage:
 *   npx tsx scripts/onboard-test-brand.ts --name "Test Supplements" --tier free
 *   npx tsx scripts/onboard-test-brand.ts --name "Dream Vitamins" --tier pro --approve
 * 
 * Options:
 *   --name       Brand name (required)
 *   --tier       free|basic|pro|mega (default: free)
 *   --approve    Auto-approve the brand (skip pending status)
 *   --shopify    Shopify store name (default: generated from name)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Subscription tier limits
const TIER_LIMITS = {
  free: {
    maxStoresPerMonth: 5,
    maxSampleProducts: 1,
    maxFullSizeProducts: 2,
    transactionFeePercent: 8.0,
    monthlyPlatformFee: 0,
  },
  basic: {
    maxStoresPerMonth: 50,
    maxSampleProducts: 3,
    maxFullSizeProducts: 6,
    transactionFeePercent: 6.0,
    monthlyPlatformFee: 99,
  },
  pro: {
    maxStoresPerMonth: 100,
    maxSampleProducts: 5,
    maxFullSizeProducts: 10,
    transactionFeePercent: 5.0,
    monthlyPlatformFee: 249,
  },
  mega: {
    maxStoresPerMonth: 250,
    maxSampleProducts: 10,
    maxFullSizeProducts: 20,
    transactionFeePercent: 4.0,
    monthlyPlatformFee: 499,
  },
};

interface OnboardingOptions {
  name: string;
  tier: 'free' | 'basic' | 'pro' | 'mega';
  approve: boolean;
  shopify?: string;
}

function parseArgs(): OnboardingOptions {
  const args = process.argv.slice(2);
  const options: Partial<OnboardingOptions> = {
    tier: 'free',
    approve: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--name':
        options.name = args[++i];
        break;
      case '--tier':
        const tier = args[++i] as OnboardingOptions['tier'];
        if (!['free', 'basic', 'pro', 'mega'].includes(tier)) {
          throw new Error(`Invalid tier: ${tier}. Must be free|basic|pro|mega`);
        }
        options.tier = tier;
        break;
      case '--approve':
        options.approve = true;
        break;
      case '--shopify':
        options.shopify = args[++i];
        break;
      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  if (!options.name) {
    throw new Error('--name is required');
  }

  return options as OnboardingOptions;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

function generateShopifyStoreName(name: string): string {
  return generateSlug(name) + '.myshopify.com';
}

async function onboardBrand(options: OnboardingOptions) {
  const { name, tier, approve, shopify } = options;
  const limits = TIER_LIMITS[tier];
  
  const slug = generateSlug(name);
  const orgId = generateOrgId(name);
  const shopifyStoreName = shopify || generateShopifyStoreName(name);

  console.log(`\n🚀 Onboarding Test Brand: ${name}`);
  console.log(`   Tier: ${tier.toUpperCase()}`);
  console.log(`   Slug: ${slug}`);
  console.log(`   OrgId: ${orgId}`);
  console.log(`   Shopify: ${shopifyStoreName}`);
  console.log(`   Status: ${approve ? 'APPROVED' : 'PENDING'}\n`);

  // Check if brand already exists
  const existing = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug },
        { orgId },
        { name },
      ],
    },
  });

  if (existing) {
    console.error(`❌ Brand already exists with name "${existing.name}" (${existing.orgId})`);
    process.exit(1);
  }

  // Create brand organization
  const brand = await prisma.organization.create({
    data: {
      orgId,
      name,
      slug,
      type: 'client',
      
      // Contact info (test data)
      supportEmail: `support@${slug}.com`,
      supportPhone: '+1-555-TEST',
      emailFromName: name,
      emailFromAddress: `hello@${slug}.com`,
      emailReplyTo: `support@${slug}.com`,
      websiteUrl: `https://www.${slug}.com`,
      customerServiceEmail: `service@${slug}.com`,
      customerServicePhone: '+1-555-HELP',
      
      // Shopify integration (not connected yet)
      shopifyStoreName,
      shopifyActive: false,
      
      // Brand subscription settings
      brandTier: tier,
      brandStatus: approve ? 'approved' : 'pending',
      maxStoresPerMonth: limits.maxStoresPerMonth,
      maxSampleProducts: limits.maxSampleProducts,
      maxFullSizeProducts: limits.maxFullSizeProducts,
      
      // Revenue settings
      transactionFeePercent: limits.transactionFeePercent,
      monthlyPlatformFee: limits.monthlyPlatformFee,
      
      // Commission defaults
      commissionRate: 10.0, // Store gets 10% of sales
      attributionWindow: 30, // 30 days
      
      // Approval workflow
      approvalStatus: approve ? 'approved' : 'pending',
      approvedAt: approve ? new Date() : null,
      approvedBy: approve ? 'SCRIPT' : null,
      onboardingStep: approve ? 'live' : 'registration',
      
      // Usage tracking
      storesAddedThisMonth: 0,
      currentActiveStores: 0,
      lastMonthlyReset: new Date(),
    },
  });

  console.log(`✅ Created brand organization: ${brand.name} (${brand.orgId})`);

  // Create sample products
  const sampleProducts = [];
  const productNames = [
    'Energy Boost Sample',
    'Sleep Aid Sample',
    'Immunity Support Sample',
    'Focus & Clarity Sample',
    'Stress Relief Sample',
  ];

  const numSamples = Math.min(limits.maxSampleProducts, productNames.length);
  
  for (let i = 0; i < numSamples; i++) {
    const product = await prisma.product.create({
      data: {
        sku: `${orgId}-SAMPLE-${i + 1}`,
        orgId: brand.id,
        name: productNames[i],
        description: `${productNames[i]} - Free sample pack`,
        category: 'sample',
        productType: 'retail',
        price: 0.00, // Samples are free
        msrp: 5.99,
        active: true,
        featured: true,
        imageUrl: `https://via.placeholder.com/400x400?text=${encodeURIComponent(productNames[i])}`,
      },
    });
    sampleProducts.push(product);
    console.log(`   📦 Sample: ${product.name} (${product.sku})`);
  }

  // Create full-size products
  const fullSizeProducts = [];
  const fullSizeNames = [
    'Energy Boost - 30 Day Supply',
    'Sleep Aid - 30 Day Supply',
    'Immunity Support - 30 Day Supply',
    'Focus & Clarity - 30 Day Supply',
    'Stress Relief - 30 Day Supply',
  ];

  const numFullSize = Math.min(limits.maxFullSizeProducts, fullSizeNames.length);
  
  for (let i = 0; i < numFullSize; i++) {
    const product = await prisma.product.create({
      data: {
        sku: `${orgId}-FULL-${i + 1}`,
        orgId: brand.id,
        name: fullSizeNames[i],
        description: `${fullSizeNames[i]} - Premium supplement`,
        category: 'supplement',
        productType: 'retail',
        price: 39.99,
        msrp: 49.99,
        active: true,
        featured: i === 0, // First one is featured
        imageUrl: `https://via.placeholder.com/400x400?text=${encodeURIComponent(fullSizeNames[i])}`,
      },
    });
    fullSizeProducts.push(product);
    console.log(`   📦 Full-Size: ${product.name} (${product.sku}) - $${product.price}`);
  }

  // Summary
  console.log(`\n✅ Brand onboarded successfully!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Brand: ${brand.name}`);
  console.log(`   OrgId: ${brand.orgId}`);
  console.log(`   Tier: ${tier.toUpperCase()}`);
  console.log(`   Status: ${brand.approvalStatus}`);
  console.log(`   Samples: ${sampleProducts.length}/${limits.maxSampleProducts}`);
  console.log(`   Full-Size: ${fullSizeProducts.length}/${limits.maxFullSizeProducts}`);
  console.log(`   Store Limit: ${limits.maxStoresPerMonth}/month`);
  console.log(`   Transaction Fee: ${limits.transactionFeePercent}%`);
  console.log(`   Monthly Fee: $${limits.monthlyPlatformFee}`);

  console.log(`\n🔗 Next Steps:`);
  console.log(`   1. Connect to stores: npx tsx scripts/connect-brand-to-store.ts --brand ${brand.orgId} --store STORE-XXX`);
  console.log(`   2. Test customer flow: Visit display and select ${brand.name} samples`);
  console.log(`   3. View in admin: /admin/brands/${brand.id}`);

  return {
    brand,
    sampleProducts,
    fullSizeProducts,
  };
}

async function main() {
  try {
    const options = parseArgs();
    await onboardBrand(options);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    console.log('\nUsage:');
    console.log('  npx tsx scripts/onboard-test-brand.ts --name "Brand Name" [options]');
    console.log('\nOptions:');
    console.log('  --name       Brand name (required)');
    console.log('  --tier       free|basic|pro|mega (default: free)');
    console.log('  --approve    Auto-approve the brand (skip pending status)');
    console.log('  --shopify    Shopify store name (optional)');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/onboard-test-brand.ts --name "Test Supplements" --tier free');
    console.log('  npx tsx scripts/onboard-test-brand.ts --name "Dream Vitamins" --tier pro --approve');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
