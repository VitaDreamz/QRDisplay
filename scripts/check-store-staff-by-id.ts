import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStoreStaff() {
  const storeInternalId = 'cmhn8fi900001kz04k6v3x06t'; // From error log
  
  console.log('🔍 Checking store and staff for internal ID:', storeInternalId);
  console.log('='.repeat(70), '\n');
  
  // Get store info
  const store = await prisma.store.findUnique({
    where: { id: storeInternalId },
    select: {
      id: true,
      storeId: true,
      storeName: true,
      staffPin: true,
      adminEmail: true,
      createdAt: true
    }
  });
  
  if (!store) {
    console.log('❌ Store not found with this internal ID!');
    await prisma.$disconnect();
    return;
  }
  
  console.log('📍 STORE INFO:');
  console.log(`  Public ID: ${store.storeId}`);
  console.log(`  Name: ${store.storeName}`);
  console.log(`  Admin Email: ${store.adminEmail}`);
  console.log(`  Admin PIN: ${store.staffPin}`);
  console.log(`  Created: ${store.createdAt}\n`);
  
  // Get all staff for this store
  const staff = await prisma.staff.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      staffId: true,
      firstName: true,
      lastName: true,
      phone: true,
      staffPin: true,
      status: true,
      verified: true,
      type: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('👥 STAFF MEMBERS:');
  console.log(`  Total: ${staff.length}\n`);
  
  if (staff.length === 0) {
    console.log('  ❌ NO STAFF FOUND FOR THIS STORE');
    console.log('  This is why PIN 6147 is being rejected!\n');
  } else {
    staff.forEach((s, i) => {
      console.log(`  Staff #${i + 1}:`);
      console.log(`    ID: ${s.staffId}`);
      console.log(`    Name: ${s.firstName} ${s.lastName}`);
      console.log(`    Phone: ${s.phone}`);
      console.log(`    PIN: ${s.staffPin} ${s.staffPin === '6147' ? '👈 THIS ONE!' : ''}`);
      console.log(`    Type: ${s.type}`);
      console.log(`    Status: ${s.status}`);
      console.log(`    Verified: ${s.verified}`);
      console.log(`    Created: ${s.createdAt}`);
      console.log('');
    });
  }
  
  console.log('='.repeat(70));
  
  await prisma.$disconnect();
}

checkStoreStaff();
