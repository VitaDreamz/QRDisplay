#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('🔍 Verifying Database Connection\n');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('supabase.co')) {
    console.log('✅ Connected to: SUPABASE');
    console.log('   Host:', dbUrl.match(/@([^:]+):/)?.[1]);
  } else if (dbUrl.includes('rlwy.net') || dbUrl.includes('railway')) {
    console.log('⚠️  Connected to: RAILWAY (OLD - SHOULD BE SUPABASE!)');
    console.log('   Host:', dbUrl.match(/@([^:]+):/)?.[1]);
  } else {
    console.log('❓ Connected to: UNKNOWN');
    console.log('   URL:', dbUrl.substring(0, 50) + '...');
  }
  
  console.log('\n📊 Database Contents:');
  
  const orgCount = await prisma.organization.count();
  console.log(`   Organizations: ${orgCount}`);
  
  const storeCount = await prisma.store.count();
  console.log(`   Stores: ${storeCount}`);
  
  const displayCount = await prisma.display.count();
  console.log(`   Displays: ${displayCount}`);
  
  const staffCount = await prisma.staff.count();
  console.log(`   Staff: ${staffCount}`);
  
  const customerCount = await prisma.customer.count();
  console.log(`   Customers: ${customerCount}`);
  
  const productCount = await prisma.product.count();
  console.log(`   Products: ${productCount}`);
  
  console.log('\n📝 Recent Stores (last 5):');
  const recentStores = await prisma.store.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      storeId: true,
      storeName: true,
      createdAt: true,
      updatedAt: true
    }
  });
  
  recentStores.forEach(store => {
    console.log(`   ${store.storeId}: ${store.storeName}`);
    console.log(`      Created: ${store.createdAt.toLocaleString()}`);
    console.log(`      Updated: ${store.updatedAt.toLocaleString()}`);
  });
  
  await prisma.$disconnect();
  console.log('\n✅ Verification complete!\n');
}

verifyDatabase().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
