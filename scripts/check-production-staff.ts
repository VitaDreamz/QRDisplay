import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProductionStaff() {
  console.log('Checking staff records in database...\n');
  
  // Get all staff
  const allStaff = await prisma.staff.findMany({
    select: {
      id: true,
      staffId: true,
      firstName: true,
      lastName: true,
      phone: true,
      staffPin: true,
      status: true,
      verified: true,
      storeId: true,
      type: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`📊 Total Staff Records: ${allStaff.length}\n`);
  
  if (allStaff.length === 0) {
    console.log('❌ No staff records found in database\n');
  } else {
    allStaff.forEach((staff, index) => {
      console.log(`Staff #${index + 1}:`);
      console.log(`  Staff ID: ${staff.staffId}`);
      console.log(`  Name: ${staff.firstName} ${staff.lastName}`);
      console.log(`  Phone: ${staff.phone}`);
      console.log(`  PIN: ${staff.staffPin}`);
      console.log(`  Type: ${staff.type}`);
      console.log(`  Status: ${staff.status}`);
      console.log(`  Verified: ${staff.verified}`);
      console.log(`  Store ID: ${staff.storeId}`);
      console.log(`  Created: ${staff.createdAt}`);
      console.log('---\n');
    });
  }
  
  // Also check the store
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-001' },
    select: { 
      id: true,
      storeId: true, 
      storeName: true, 
      staffPin: true 
    }
  });
  
  if (store) {
    console.log('Store Info:');
    console.log(`  Store ID (public): ${store.storeId}`);
    console.log(`  Store ID (internal): ${store.id}`);
    console.log(`  Name: ${store.storeName}`);
    console.log(`  Admin PIN: ${store.staffPin}`);
  }
  
  await prisma.$disconnect();
}

checkProductionStaff();
