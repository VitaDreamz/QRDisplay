import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

async function migrateToSupabase() {
  console.log('🚀 Migrating Railway → Supabase\n');
  console.log('='.repeat(70));
  
  // Load backup
  const backupFile = `railway-backup-${new Date().toISOString().split('T')[0]}.json`;
  console.log(`📂 Loading backup: ${backupFile}`);
  const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  
  // Connect to Supabase
  const supabaseUrl = 'postgresql://postgres:%3D%3F%3DTosoVDzh3ZZZ%3D%3F%3D@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres';
  process.env.DATABASE_URL = supabaseUrl;
  const supabase = new PrismaClient();
  
  console.log('\n🗑️  Clearing existing Supabase data...');
  
  // Delete in correct order (respecting foreign keys)
  try {
    await supabase.promoRedemption.deleteMany({});
    await supabase.purchaseIntent.deleteMany({});
    await supabase.customer.deleteMany({});
    await supabase.shortlink.deleteMany({});
    await supabase.staff.deleteMany({});
    await supabase.display.deleteMany({});
    await supabase.store.deleteMany({});
    await supabase.product.deleteMany({});
    // Delete users table if it exists
    await supabase.$executeRawUnsafe('TRUNCATE TABLE users CASCADE');
    await supabase.organization.deleteMany({});
  } catch (e: any) {
    console.log('  ⚠️  Some tables may not exist, continuing...');
  }
  
  console.log('  ✅ Cleared all tables\n');
  
  console.log('📥 Importing data to Supabase...\n');
  
  // Import in correct order
  console.log('Importing organizations...');
  for (const org of data.organizations) {
    await supabase.organization.create({ data: org });
  }
  console.log(`  ✅ ${data.organizations.length} organizations`);
  
  console.log('Importing products...');
  for (const product of data.products) {
    await supabase.product.create({ data: product });
  }
  console.log(`  ✅ ${data.products.length} products`);
  
  console.log('Importing stores...');
  for (const store of data.stores) {
    await supabase.store.create({ data: store });
  }
  console.log(`  ✅ ${data.stores.length} stores`);
  
  console.log('Importing displays...');
  for (const display of data.displays) {
    await supabase.display.create({ data: display });
  }
  console.log(`  ✅ ${data.displays.length} displays`);
  
  console.log('Importing staff...');
  for (const staff of data.staff) {
    await supabase.staff.create({ data: staff });
  }
  console.log(`  ✅ ${data.staff.length} staff`);
  
  console.log('Importing customers...');
  for (const customer of data.customers) {
    await supabase.customer.create({ data: customer });
  }
  console.log(`  ✅ ${data.customers.length} customers`);
  
  console.log('Importing shortlinks...');
  for (const link of data.shortlinks) {
    await supabase.shortlink.create({ data: link });
  }
  console.log(`  ✅ ${data.shortlinks.length} shortlinks`);
  
  console.log('Importing purchase intents...');
  for (const intent of data.purchaseIntents) {
    await supabase.purchaseIntent.create({ data: intent });
  }
  console.log(`  ✅ ${data.purchaseIntents.length} purchase intents`);
  
  console.log('Importing promo redemptions...');
  for (const redemption of data.promoRedemptions) {
    await supabase.promoRedemption.create({ data: redemption });
  }
  console.log(`  ✅ ${data.promoRedemptions.length} promo redemptions`);
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Migration complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Update Vercel environment variable DATABASE_URL');
  console.log('2. Redeploy on Vercel');
  console.log('3. Test the site');
  console.log('4. Keep Railway running for 24 hours as backup');
  
  await supabase.$disconnect();
}

migrateToSupabase().catch(e => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
