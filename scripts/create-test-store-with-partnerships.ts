/**
 * Create a test store and connect it to all VitaDreamz brands
 */

import prisma from '../lib/prisma';

async function createTestStore() {
  try {
    console.log('🏪 Creating test store...\n');

    // Get all VitaDreamz brand organizations
    const brands = await prisma.organization.findMany({
      where: {
        name: {
          startsWith: 'VitaDreamz',
        },
      },
    });

    if (brands.length === 0) {
      console.error('❌ No VitaDreamz brands found! Run setup-vitadreamz-test-brands.ts first.');
      return;
    }

    console.log(`Found ${brands.length} VitaDreamz brands:`);
    brands.forEach(b => console.log(`   - ${b.name} (${b.id})`));

    // Get or create QRDisplay platform org
    let qrdisplay = await prisma.organization.findFirst({
      where: { type: 'platform' },
    });

    if (!qrdisplay) {
      qrdisplay = await prisma.organization.create({
        data: {
          orgId: 'ORG-QRDISPLAY',
          name: 'QRDisplay',
          slug: 'qrdisplay',
          type: 'platform',
          supportEmail: 'jbonutto@gmail.com',
          supportPhone: '+19496836147',
        },
      });
      console.log(`\n✅ Created QRDisplay platform org`);
    }

    // Create test store
    const store = await prisma.store.create({
      data: {
        storeId: 'SID-TEST-001',
        storeName: 'Test Smoke Shop',
        ownerName: 'James Bonutto',
        ownerPhone: '9496836147',
        ownerEmail: 'jbonutto@gmail.com',
        adminName: 'James Bonutto',
        adminEmail: 'jbonutto@gmail.com',
        adminPhone: '9496836147',
        purchasingManager: 'James Bonutto',
        purchasingPhone: '9496836147',
        purchasingEmail: 'jbonutto@gmail.com',
        streetAddress: '123 Test Street',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        timezone: 'America/Los_Angeles',
        promoOffer: '20% Off Your First Purchase',
        returningCustomerPromo: '10% Off Your Next Visit',
        followupDays: [4, 12],
        postPurchaseFollowupDays: [45, 90],
        staffPin: '1234',
        status: 'active',
        organization: {
          connect: { id: qrdisplay.id },
        },
      },
    });

    console.log(`\n✅ Created store: ${store.storeName} (${store.id})`);

    // Get all products for each brand
    const allProducts = await prisma.product.findMany({
      where: {
        orgId: {
          in: brands.map(b => b.id),
        },
      },
    });

    console.log(`\n🔗 Creating partnerships with all brands...\n`);

    // Create partnerships with each brand
    for (const brand of brands) {
      const brandProducts = allProducts.filter(p => p.orgId === brand.id);
      const sampleSkus = brandProducts.filter(p => p.productType === 'sample').map(p => p.sku);
      const productSkus = brandProducts.filter(p => p.productType === 'retail').map(p => p.sku);

      const partnership = await prisma.storeBrandPartnership.create({
        data: {
          storeId: store.id,
          brandId: brand.id,
          commissionRate: 10.0,
          onlineCommission: 20.0,
          subscriptionCommission: 5.0,
          promoCommission: 50.0,
          availableSamples: sampleSkus,
          availableProducts: productSkus,
          active: true,
        },
      });

      console.log(`   ✅ ${brand.name}`);
      console.log(`      - Samples: ${sampleSkus.join(', ')}`);
      console.log(`      - Products: ${productSkus.join(', ')}`);
    }

    console.log(`\n🎉 Test store setup complete!`);
    console.log(`\nStore Details:`);
    console.log(`   ID: ${store.id}`);
    console.log(`   Store ID: ${store.storeId}`);
    console.log(`   Name: ${store.storeName}`);
    console.log(`   Partnerships: ${brands.length} brands`);
    console.log(`\nNext: Visit http://localhost:3001/store/dashboard to test!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestStore();
