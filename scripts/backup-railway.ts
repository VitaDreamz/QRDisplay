import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

// Railway connection
process.env.DATABASE_URL = 'postgresql://postgres:jFxvmobHkrlWQnDluSWCqxDhOQwhEiNK@shuttle.proxy.rlwy.net:53529/railway';
const railway = new PrismaClient();

async function exportData() {
  console.log('📦 Exporting Railway Database to JSON...\n');
  console.log('='.repeat(70));
  
  const data: any = {};
  
  // Export all tables
  console.log('Exporting organizations...');
  data.organizations = await railway.organization.findMany();
  console.log(`  ✅ ${data.organizations.length} organizations`);
  
  console.log('Exporting stores...');
  data.stores = await railway.store.findMany();
  console.log(`  ✅ ${data.stores.length} stores`);
  
  console.log('Exporting displays...');
  data.displays = await railway.display.findMany();
  console.log(`  ✅ ${data.displays.length} displays`);
  
  console.log('Exporting staff...');
  data.staff = await railway.staff.findMany();
  console.log(`  ✅ ${data.staff.length} staff`);
  
  console.log('Exporting customers...');
  data.customers = await railway.customer.findMany();
  console.log(`  ✅ ${data.customers.length} customers`);
  
  console.log('Exporting purchase intents...');
  data.purchaseIntents = await railway.purchaseIntent.findMany();
  console.log(`  ✅ ${data.purchaseIntents.length} purchase intents`);
  
  console.log('Exporting promo redemptions...');
  data.promoRedemptions = await railway.promoRedemption.findMany();
  console.log(`  ✅ ${data.promoRedemptions.length} promo redemptions`);
  
  console.log('Exporting shortlinks...');
  data.shortlinks = await railway.shortlink.findMany();
  console.log(`  ✅ ${data.shortlinks.length} shortlinks`);
  
  console.log('Exporting products...');
  data.products = await railway.product.findMany();
  console.log(`  ✅ ${data.products.length} products`);
  
  // Save to file
  const filename = `railway-backup-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  
  console.log('\n' + '='.repeat(70));
  console.log(`✅ Backup saved to: ${filename}`);
  console.log(`📊 Total records: ${
    data.organizations.length +
    data.stores.length +
    data.displays.length +
    data.staff.length +
    data.customers.length +
    data.purchaseIntents.length +
    data.promoRedemptions.length +
    data.shortlinks.length +
    data.products.length
  }`);
  
  await railway.$disconnect();
}

exportData().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
