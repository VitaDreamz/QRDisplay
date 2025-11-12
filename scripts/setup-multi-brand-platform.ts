/**
 * Setup Multi-Brand Platform Architecture
 * 
 * This script:
 * 1. Creates QRDisplay/SampleHound platform organization
 * 2. Converts VitaDreamz from 'client' to 'brand' type
 * 3. Migrates existing stores to platform ownership
 * 4. Creates StoreBrandPartnership records for existing stores
 * 5. Migrates customer sample history
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Multi-Brand Platform Setup...\n');

  // Step 1: Create Platform Organization
  console.log('📦 Step 1: Creating Platform Organization...');
  
  const platform = await prisma.organization.upsert({
    where: { orgId: 'qrdisplay-platform' },
    update: {},
    create: {
      orgId: 'qrdisplay-platform',
      name: 'QRDisplay',
      slug: 'qrdisplay',
      type: 'platform',
      logoUrl: '/images/qrdisplay-logo.png',
      supportEmail: 'support@qrdisplay.com',
      supportPhone: '+1-844-969-2864',
      emailFromName: 'QRDisplay',
      emailFromAddress: 'noreply@qrdisplay.com',
    },
  });
  
  console.log(`✅ Platform created: ${platform.name} (${platform.orgId})\n`);

  // Step 2: Convert VitaDreamz to Brand
  console.log('🏷️  Step 2: Converting VitaDreamz to Brand type...');
  
  const vitadreamz = await prisma.organization.update({
    where: { orgId: 'vitadreamz' },
    data: {
      type: 'brand', // Changed from 'client' to 'brand'
    },
  });
  
  console.log(`✅ VitaDreamz converted to brand type\n`);

  // Step 3: Migrate Stores to Platform Ownership
  console.log('🏪 Step 3: Migrating stores to platform ownership...');
  
  const stores = await prisma.store.findMany({
    where: { orgId: 'vitadreamz' },
  });
  
  console.log(`Found ${stores.length} stores to migrate`);
  
  for (const store of stores) {
    await prisma.store.update({
      where: { id: store.id },
      data: {
        platformId: platform.id, // NEW: Store now belongs to platform
        // Keep orgId for backwards compatibility during transition
      },
    });
    console.log(`  ✓ Migrated ${store.storeName} (${store.storeId})`);
  }
  
  console.log(`✅ All stores migrated to platform\n`);

  // Step 4: Create Brand Partnerships
  console.log('🤝 Step 4: Creating StoreBrandPartnership records...');
  
  for (const store of stores) {
    const partnership = await prisma.storeBrandPartnership.create({
      data: {
        storeId: store.id,
        brandId: vitadreamz.id,
        commissionRate: store.commissionRate || 10.0,
        availableSamples: store.availableSamples || [],
        availableProducts: store.availableProducts || [],
        active: true,
        partnerSince: store.createdAt,
      },
    });
    
    console.log(`  ✓ Created partnership: ${store.storeName} ↔ VitaDreamz`);
  }
  
  console.log(`✅ All partnerships created\n`);

  // Step 5: Migrate Sample History
  console.log('📊 Step 5: Migrating customer sample history...');
  
  const customers = await prisma.customer.findMany({
    where: {
      sampleChoice: { not: null },
    },
  });
  
  console.log(`Found ${customers.length} customers with sample history`);
  
  for (const customer of customers) {
    if (customer.sampleChoice && customer.sampleDate) {
      await prisma.sampleHistory.create({
        data: {
          customerId: customer.id,
          brandId: vitadreamz.id,
          storeId: customer.storeId,
          displayId: customer.displayId,
          productSku: customer.sampleChoice,
          productName: customer.sampleChoice, // Will be updated when Product records exist
          sampledAt: customer.sampleDate,
          attributionWindow: 30,
          expiresAt: new Date(customer.sampleDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  
  console.log(`✅ Sample history migrated\n`);

  // Summary
  console.log('🎉 Multi-Brand Platform Setup Complete!\n');
  console.log('Summary:');
  console.log(`  - Platform: ${platform.name}`);
  console.log(`  - Brands: 1 (VitaDreamz)`);
  console.log(`  - Stores: ${stores.length}`);
  console.log(`  - Partnerships: ${stores.length}`);
  console.log(`  - Sample History Records: ${customers.length}`);
  console.log('\n✨ Ready for multi-brand operation!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
