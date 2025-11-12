import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function restoreDatabase() {
  console.log('🔄 Starting database restoration from Railway backup...\n');

  // Read the backup file
  const backupPath = path.join(__dirname, '..', 'railway-backup-2025-11-06.json');
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  try {
    // Import in dependency order
    console.log('📦 Importing Organizations...');
    for (const org of backupData.organizations || []) {
      await prisma.organization.upsert({
        where: { orgId: org.orgId },
        update: org,
        create: org,
      });
    }
    console.log(`✅ Imported ${backupData.organizations?.length || 0} organizations\n`);

    console.log('📦 Importing Stores...');
    for (const store of backupData.stores || []) {
      await prisma.store.upsert({
        where: { storeId: store.storeId },
        update: store,
        create: store,
      });
    }
    console.log(`✅ Imported ${backupData.stores?.length || 0} stores\n`);

    console.log('📦 Importing Products...');
    for (const product of backupData.products || []) {
      await prisma.product.upsert({
        where: { sku: product.sku },
        update: product,
        create: product,
      });
    }
    console.log(`✅ Imported ${backupData.products?.length || 0} products\n`);

    console.log('📦 Importing Displays...');
    for (const display of backupData.displays || []) {
      // Handle foreign key - assignedOrgId references organization.id, not orgId
      const displayData = { ...display };
      
      // If assignedOrgId is set, find the corresponding org's id (not orgId)
      if (displayData.assignedOrgId) {
        const org = await prisma.organization.findUnique({
          where: { orgId: displayData.assignedOrgId },
          select: { id: true }
        });
        if (org) {
          displayData.assignedOrgId = org.id;
        } else {
          displayData.assignedOrgId = null;
        }
      }
      
      await prisma.display.upsert({
        where: { displayId: display.displayId },
        update: displayData,
        create: displayData,
      });
    }
    console.log(`✅ Imported ${backupData.displays?.length || 0} displays\n`);

    console.log('📦 Importing Customers...');
    for (const customer of backupData.customers || []) {
      // Handle foreign key - orgId references organization.id, not orgId
      const customerData = { ...customer };
      
      // Find the org's id (database id, not orgId)
      const org = await prisma.organization.findUnique({
        where: { orgId: customer.orgId },
        select: { id: true }
      });
      
      if (org) {
        customerData.orgId = org.id;
        
        await prisma.customer.upsert({
          where: { memberId: customer.memberId },
          update: customerData,
          create: customerData,
        });
      } else {
        console.warn(`⚠️  Skipping customer ${customer.memberId} - org ${customer.orgId} not found`);
      }
    }
    console.log(`✅ Imported ${backupData.customers?.length || 0} customers\n`);

    console.log('📦 Importing Staff...');
    for (const staff of backupData.staff || []) {
      await prisma.staff.upsert({
        where: { staffId: staff.staffId },
        update: staff,
        create: staff,
      });
    }
    console.log(`✅ Imported ${backupData.staff?.length || 0} staff members\n`);

    console.log('📦 Importing Shortlinks...');
    for (const shortlink of backupData.shortlinks || []) {
      await prisma.shortlink.upsert({
        where: { slug: shortlink.slug },
        update: shortlink,
        create: shortlink,
      });
    }
    console.log(`✅ Imported ${backupData.shortlinks?.length || 0} shortlinks\n`);

    // Verify restoration
    console.log('\n🔍 Verifying restoration...');
    const [orgs, stores, displays, customers, products] = await Promise.all([
      prisma.organization.count(),
      prisma.store.count(),
      prisma.display.count(),
      prisma.customer.count(),
      prisma.product.count(),
    ]);

    console.log('\n✅ DATABASE RESTORED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Organizations: ${orgs}`);
    console.log(`Stores: ${stores}`);
    console.log(`Displays: ${displays}`);
    console.log(`Customers: ${customers}`);
    console.log(`Products: ${products}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error during restoration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreDatabase()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
