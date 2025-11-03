import prisma from '../lib/prisma';

async function resetData() {
  console.log('🔄 Resetting all data for fresh start...\n');

  // Delete in correct order (respecting foreign keys)
  console.log('Deleting customers...');
  await prisma.customer.deleteMany({});
  
  console.log('Deleting stores...');
  await prisma.store.deleteMany({});
  
  console.log('Deleting displays...');
  await prisma.display.deleteMany({});
  
  console.log('Deleting display packs...');
  await prisma.displayPack.deleteMany({});
  
  console.log('Deleting orders...');
  await prisma.order.deleteMany({});
  
  console.log('Deleting users (except super-admin)...');
  await prisma.user.deleteMany({
    where: {
      role: { not: 'super-admin' }
    }
  });
  
  console.log('Deleting client organizations...');
  await prisma.organization.deleteMany({
    where: {
      type: 'client'
    }
  });

  console.log('\n✅ All data cleared!\n');
  console.log('📋 What remains:');
  console.log('   - Platform organization (ORG-QRDISPLAY)');
  console.log('   - Super-admin users');
  console.log('\n🎯 Ready to test:');
  console.log('   1. Create a new brand at /admin/brands/new');
  console.log('   2. Assign displays to that brand');
  console.log('   3. Test activation flow with new forms');
  console.log('   4. Verify SMS to both store manager AND brand owner\n');
}

resetData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
