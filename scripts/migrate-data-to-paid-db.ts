import { PrismaClient } from '@prisma/client';

// Source DB (multi-brand) - explicitly set URL
const sourceDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.dowalcgdjqcjsjkcbidf:MultiBrand2025@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
    },
  },
});

// Target DB (paid) - explicitly set URL
const targetDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:QRD1splay16359@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres',
    },
  },
});

async function migrateData() {
  try {
    console.log('🔍 Checking source database...');
    
    // Check what data exists in source
    const orgs = await sourceDb.organization.findMany();
    const products = await sourceDb.product.findMany();
    const stores = await sourceDb.store.findMany();
    const partnerships = await sourceDb.storeBrandPartnership.findMany();
    
    console.log(`\n📊 Source database contains:`);
    console.log(`   - ${orgs.length} organizations`);
    console.log(`   - ${products.length} products`);
    console.log(`   - ${stores.length} stores`);
    console.log(`   - ${partnerships.length} partnerships`);
    
    if (orgs.length === 0) {
      console.log('\n⚠️  No data to migrate!');
      return;
    }
    
    console.log('\n🚀 Starting migration to paid database...\n');
    
    // Migrate organizations first (they're referenced by other tables)
    console.log('📦 Migrating organizations...');
    for (const org of orgs) {
      await targetDb.organization.upsert({
        where: { id: org.id },
        update: org,
        create: org,
      });
    }
    console.log(`   ✅ Migrated ${orgs.length} organizations`);
    
    // Migrate products
    console.log('📦 Migrating products...');
    for (const product of products) {
      await targetDb.product.upsert({
        where: { id: product.id },
        update: product,
        create: product,
      });
    }
    console.log(`   ✅ Migrated ${products.length} products`);
    
    // Migrate stores
    console.log('📦 Migrating stores...');
    for (const store of stores) {
      await targetDb.store.upsert({
        where: { id: store.id },
        update: store,
        create: store,
      });
    }
    console.log(`   ✅ Migrated ${stores.length} stores`);
    
    // Migrate partnerships
    console.log('📦 Migrating store-brand partnerships...');
    for (const partnership of partnerships) {
      await targetDb.storeBrandPartnership.upsert({
        where: { id: partnership.id },
        update: partnership,
        create: partnership,
      });
    }
    console.log(`   ✅ Migrated ${partnerships.length} partnerships`);
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const targetOrgs = await targetDb.organization.count();
    const targetProducts = await targetDb.product.count();
    const targetStores = await targetDb.store.count();
    const targetPartnerships = await targetDb.storeBrandPartnership.count();
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   - Organizations: ${targetOrgs}`);
    console.log(`   - Products: ${targetProducts}`);
    console.log(`   - Stores: ${targetStores}`);
    console.log(`   - Partnerships: ${targetPartnerships}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  }
}

migrateData();
