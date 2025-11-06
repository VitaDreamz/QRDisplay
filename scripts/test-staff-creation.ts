import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testStaffCreation() {
  console.log('Testing staff creation...\n');
  
  // Get the store
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-001' },
    select: { id: true, storeId: true, storeName: true }
  });
  
  console.log('Store found:', store);
  
  if (!store) {
    console.log('❌ Store not found!');
    return;
  }
  
  // Test phone parsing
  const testPhone = '+1 (234) 567-6147'; // Example phone that ends in 6147
  const digits = String(testPhone).replace(/\D/g, '');
  const derivedPin = digits.slice(-4);
  
  console.log('\nPhone parsing test:');
  console.log('  Input phone:', testPhone);
  console.log('  Digits only:', digits);
  console.log('  Derived PIN:', derivedPin);
  
  // Check for existing staff with this PIN
  const existingStaff = await prisma.staff.findFirst({
    where: {
      storeId: store.id,
      staffPin: derivedPin,
      status: 'active'
    }
  });
  
  console.log('\nExisting staff with PIN', derivedPin, ':', existingStaff ? 'FOUND' : 'Not found');
  
  // Create test staff
  try {
    console.log('\nAttempting to create staff...');
    const staff = await prisma.staff.create({
      data: {
        staffId: 'STF-TEST-001',
        storeId: store.id,
        firstName: 'Test',
        lastName: 'Staff',
        email: 'test@example.com',
        phone: testPhone,
        type: 'staff',
        staffPin: derivedPin,
        verified: false,
        verificationToken: 'test-token',
        verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        onCallDays: [],
        onCallHoursStart: '09:00',
        onCallHoursStop: '17:00',
        hireDate: new Date(),
        status: 'pending'
      }
    });
    
    console.log('\n✅ Staff created successfully!');
    console.log('  Staff ID:', staff.staffId);
    console.log('  Staff PIN:', staff.staffPin);
    console.log('  Store ID:', staff.storeId);
    
    // Clean up test staff
    await prisma.staff.delete({
      where: { id: staff.id }
    });
    console.log('\n✅ Test staff cleaned up');
    
  } catch (error) {
    console.error('\n❌ Staff creation failed:', error);
  }
  
  await prisma.$disconnect();
}

testStaffCreation();
