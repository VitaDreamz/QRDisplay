import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseStaffPin() {
  console.log('🔍 Diagnosing Staff PIN Issue (Production Database)\n');
  console.log('='.repeat(60));
  
  // 1. Check the store
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-001' },
    select: {
      id: true,
      storeId: true,
      storeName: true,
      staffPin: true
    }
  });
  
  console.log('\n📍 STORE INFO:');
  if (store) {
    console.log(`  Store ID (public): ${store.storeId}`);
    console.log(`  Store Name: ${store.storeName}`);
    console.log(`  Admin PIN: ${store.staffPin}`);
    console.log(`  Internal ID: ${store.id}`);
  } else {
    console.log('  ❌ Store not found!');
    await prisma.$disconnect();
    return;
  }
  
  // 2. Check all staff members for this store
  const staff = await prisma.staff.findMany({
    where: {
      storeId: store.id
    },
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
  
  console.log('\n👥 STAFF MEMBERS:');
  console.log(`  Total count: ${staff.length}\n`);
  
  if (staff.length === 0) {
    console.log('  ❌ NO STAFF MEMBERS FOUND');
    console.log('  This means staff was never created in production!');
  } else {
    staff.forEach((s, i) => {
      console.log(`  Staff #${i + 1}:`);
      console.log(`    ID: ${s.staffId}`);
      console.log(`    Name: ${s.firstName} ${s.lastName}`);
      console.log(`    Phone: ${s.phone}`);
      console.log(`    PIN: ${s.staffPin}`);
      console.log(`    Type: ${s.type}`);
      console.log(`    Status: ${s.status}`);
      console.log(`    Verified: ${s.verified}`);
      console.log(`    Created: ${s.createdAt}`);
      console.log('');
    });
  }
  
  // 3. Test PIN validation logic
  console.log('🧪 TESTING PIN VALIDATION LOGIC:\n');
  
  const testPins = ['1234', '6147'];
  
  for (const testPin of testPins) {
    console.log(`  Testing PIN: ${testPin}`);
    
    // Check admin PIN
    const isAdminPin = store.staffPin === testPin;
    console.log(`    Admin PIN match: ${isAdminPin ? '✅ YES' : '❌ NO'}`);
    
    // Check staff PIN
    const staffMatch = await prisma.staff.findFirst({
      where: {
        storeId: store.id,
        staffPin: testPin,
        status: 'active'
      }
    });
    
    if (staffMatch) {
      console.log(`    Staff PIN match: ✅ YES (${staffMatch.firstName} ${staffMatch.lastName})`);
    } else {
      console.log(`    Staff PIN match: ❌ NO`);
    }
    
    const wouldAccept = isAdminPin || !!staffMatch;
    console.log(`    Result: ${wouldAccept ? '✅ ACCEPTED' : '❌ REJECTED'}\n`);
  }
  
  console.log('='.repeat(60));
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (staff.length === 0) {
    console.log('  • No staff found in production database');
    console.log('  • Staff creation during wizard likely failed');
    console.log('  • Try adding staff through the dashboard instead');
    console.log('  • Check browser console for errors during wizard submission');
  } else {
    const activeStaff = staff.filter(s => s.status === 'active');
    if (activeStaff.length === 0) {
      console.log('  • Staff exists but status is not "active"');
      console.log('  • Update staff status to "active" in the dashboard');
    } else {
      console.log('  • Staff exists and is active');
      console.log('  • PIN validation should work correctly');
      console.log('  • If still failing, check the redemption API logs');
    }
  }
  
  await prisma.$disconnect();
}

diagnoseStaffPin();
