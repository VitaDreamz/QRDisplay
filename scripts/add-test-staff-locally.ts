import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTestStaff() {
  console.log('Adding test staff member locally...\n');
  
  // Get the store
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-001' },
    select: { id: true, storeId: true, storeName: true }
  });
  
  if (!store) {
    console.log('❌ Store SID-001 not found!');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`Found store: ${store.storeName}\n`);
  
  // Example staff with PIN 6147 (phone ending in 6147)
  const testPhone = '+1 (234) 567-6147';
  const digits = String(testPhone).replace(/\D/g, '');
  const staffPin = digits.slice(-4);
  
  // Check if staff with this PIN already exists
  const existing = await prisma.staff.findFirst({
    where: {
      storeId: store.id,
      staffPin: staffPin
    }
  });
  
  if (existing) {
    console.log(`⚠️  Staff with PIN ${staffPin} already exists:`);
    console.log(`   Name: ${existing.firstName} ${existing.lastName}`);
    console.log(`   Staff ID: ${existing.staffId}`);
    await prisma.$disconnect();
    return;
  }
  
  // Create the staff member
  const staff = await prisma.staff.create({
    data: {
      staffId: 'STF-001',
      storeId: store.id,
      firstName: 'Test',
      lastName: 'Staff',
      email: 'teststaff@example.com',
      phone: testPhone,
      type: 'Sales',
      staffPin: staffPin,
      verified: true,
      verificationToken: 'test-token',
      verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      onCallDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      onCallHoursStart: '09:00',
      onCallHoursStop: '17:00',
      hireDate: new Date(),
      status: 'active'
    }
  });
  
  console.log('✅ Test staff member created successfully!\n');
  console.log('Staff Details:');
  console.log(`  Staff ID: ${staff.staffId}`);
  console.log(`  Name: ${staff.firstName} ${staff.lastName}`);
  console.log(`  Phone: ${staff.phone}`);
  console.log(`  PIN: ${staff.staffPin}`);
  console.log(`  Type: ${staff.type}`);
  console.log(`  Status: ${staff.status}`);
  console.log(`  Verified: ${staff.verified}`);
  console.log('\n✨ You can now test PIN validation locally with PIN: ' + staff.staffPin);
  
  await prisma.$disconnect();
}

addTestStaff();
