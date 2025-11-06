import { PrismaClient } from '@prisma/client';

// Override with Railway URL
process.env.DATABASE_URL = 'postgresql://postgres:jFxvmobHkrlWQnDluSWCqxDhOQwhEiNK@shuttle.proxy.rlwy.net:53529/railway';

const prisma = new PrismaClient();

async function checkRailway() {
  console.log('🔍 Checking RAILWAY (Production) Database\n');
  console.log('='.repeat(70));
  
  // Get all stores
  const stores = await prisma.store.findMany({
    select: { 
      id: true,
      storeId: true, 
      storeName: true,
      staffPin: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\n📍 STORES:', stores.length, '\n');
  stores.forEach((s, i) => {
    console.log(`Store #${i + 1}: ${s.storeName} (${s.storeId})`);
    console.log(`  Internal ID: ${s.id}`);
    console.log(`  Admin PIN: ${s.staffPin}`);
    console.log('');
  });
  
  // Get all staff across all stores
  const allStaff = await prisma.staff.findMany({
    select: {
      staffId: true,
      firstName: true,
      lastName: true,
      phone: true,
      staffPin: true,
      status: true,
      storeId: true
    }
  });
  
  console.log('👥 STAFF MEMBERS:', allStaff.length, '\n');
  
  if (allStaff.length === 0) {
    console.log('  ❌ NO STAFF IN RAILWAY DATABASE!\n');
    console.log('  This explains why PIN 6147 is rejected - staff was never created!\n');
  } else {
    allStaff.forEach((s, i) => {
      console.log(`Staff #${i + 1}: ${s.firstName} ${s.lastName}`);
      console.log(`  PIN: ${s.staffPin}`);
      console.log(`  Phone: ${s.phone}`);
      console.log(`  Status: ${s.status}`);
      console.log(`  Store ID: ${s.storeId}`);
      console.log('');
    });
  }
  
  // Find the specific store from error log
  console.log('🔎 Looking for store from error log...\n');
  const errorStore = await prisma.store.findUnique({
    where: { id: 'cmhn8fi900001kz04k6v3x06t' },
    select: {
      id: true,
      storeId: true,
      storeName: true,
      staffPin: true
    }
  });
  
  if (errorStore) {
    console.log('✅ Found the store from error log!');
    console.log(`   Name: ${errorStore.storeName}`);
    console.log(`   Public ID: ${errorStore.storeId}`);
    console.log(`   Admin PIN: ${errorStore.staffPin}`);
    
    // Check staff for this specific store
    const staffForStore = await prisma.staff.findMany({
      where: { storeId: errorStore.id },
      select: {
        staffId: true,
        firstName: true,
        lastName: true,
        staffPin: true,
        status: true
      }
    });
    
    console.log(`\n   Staff for this store: ${staffForStore.length}`);
    if (staffForStore.length > 0) {
      staffForStore.forEach(s => {
        console.log(`     - ${s.firstName} ${s.lastName} (PIN: ${s.staffPin}, Status: ${s.status})`);
      });
    } else {
      console.log('     ❌ NO STAFF - Add staff to this store!');
    }
  } else {
    console.log('❌ Store cmhn8fi900001kz04k6v3x06t not found in Railway!');
  }
  
  console.log('\n' + '='.repeat(70));
  
  await prisma.$disconnect();
}

checkRailway().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
