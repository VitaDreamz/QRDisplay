import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testStaffApiResponse() {
  console.log('Testing what staff API returns...\n');
  
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-001' },
    select: { id: true }
  });
  
  if (!store) {
    console.log('Store not found');
    return;
  }
  
  // This is what the API does
  const staff = await prisma.staff.findMany({
    where: { storeId: store.id },
    orderBy: [
      { samplesRedeemed: 'desc' },
      { salesGenerated: 'desc' }
    ]
  });
  
  console.log(`Found ${staff.length} staff members\n`);
  
  staff.forEach((s, i) => {
    console.log(`Staff #${i + 1}:`);
    console.log('  staffId:', s.staffId);
    console.log('  Name:', s.firstName, s.lastName);
    console.log('  Phone:', s.phone);
    console.log('  staffPin:', s.staffPin, '👈 THIS IS THE KEY FIELD');
    console.log('  Type:', s.type);
    console.log('  Status:', s.status);
    console.log('  Verified:', s.verified);
    console.log('');
  });
  
  await prisma.$disconnect();
}

testStaffApiResponse();
