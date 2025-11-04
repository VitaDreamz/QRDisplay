import prisma from '../lib/prisma';
import * as readline from 'readline';

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  console.log('🧹 PRODUCTION DATABASE CLEANUP\n');
  console.log('⚠️  WARNING: This will delete:');
  console.log('   - All customers');
  console.log('   - All staff members');
  console.log('   - All stores');
  console.log('   - Reset all displays to "sold" status\n');
  console.log('✅ This will keep:');
  console.log('   - All organizations (VitaDreamz, QR Display)');
  console.log('   - All display QR codes (QRD-001 to QRD-093)\n');

  const answer = await askQuestion('Are you sure you want to continue? (yes/no): ');
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Cleanup cancelled.');
    return;
  }

  console.log('\n🧹 Starting cleanup...\n');
  
  // Show database info
  const dbUrl = process.env.DATABASE_URL || '';
  const isProduction = dbUrl.includes('supabase') || dbUrl.includes('amazonaws');
  console.log(`📍 Database: ${isProduction ? '🔴 PRODUCTION' : '🟢 LOCAL'}`);
  if (!isProduction) {
    console.log('⚠️  This appears to be a local database. Make sure DATABASE_URL points to production!\n');
  } else {
    console.log('✅ Connected to production database\n');
  }

  // Step 1: Delete all customers
  console.log('Deleting customers...');
  const deletedCustomers = await prisma.customer.deleteMany({});
  console.log(`✅ Deleted ${deletedCustomers.count} customers`);

  // Step 2: Delete all staff members
  console.log('Deleting staff members...');
  const deletedStaff = await prisma.staff.deleteMany({});
  console.log(`✅ Deleted ${deletedStaff.count} staff members`);

  // Step 3: Delete all stores
  console.log('Deleting stores...');
  const deletedStores = await prisma.store.deleteMany({});
  console.log(`✅ Deleted ${deletedStores.count} stores`);

  // Step 4: Get VitaDreamz organization ID
  console.log('\nFinding VitaDreamz organization...');
  const vitadreamz = await prisma.organization.findUnique({
    where: { slug: 'vitadreamz' }
  });

  if (!vitadreamz) {
    console.warn('⚠️  VitaDreamz organization not found - checking for any organization...');
    const anyOrg = await prisma.organization.findFirst();
    if (anyOrg) {
      console.log(`✅ Using ${anyOrg.name} (ID: ${anyOrg.id})`);
      // Step 5: Reset all displays with first available org
      console.log('\nResetting displays...');
      const updatedDisplays = await prisma.display.updateMany({
        data: {
          status: 'sold',
          storeId: null,
          activatedAt: null,
          assignedOrgId: null, // Clear assignment
          ownerOrgId: anyOrg.id,
        }
      });
      console.log(`✅ Reset ${updatedDisplays.count} displays to 'sold' status`);
    } else {
      console.error('❌ No organizations found! Cannot reset displays.');
    }
  } else {
    console.log(`✅ Found VitaDreamz (ID: ${vitadreamz.id})`);
    
    // Step 5: Reset all displays to 'sold' status with VitaDreamz as owner
    console.log('\nResetting displays...');
    const updatedDisplays = await prisma.display.updateMany({
      data: {
        status: 'sold',
        storeId: null,
        activatedAt: null,
        assignedOrgId: null, // Clear assignment - will be set during activation
        ownerOrgId: vitadreamz.id,
      }
    });
    console.log(`✅ Reset ${updatedDisplays.count} displays to 'sold' status`);
  }

  // Step 6: Show summary
  console.log('\n📊 Final State:');
  const organizations = await prisma.organization.findMany();
  console.log(`   Organizations: ${organizations.length}`);
  organizations.forEach(org => {
    console.log(`   - ${org.name} (${org.slug})`);
  });

  const displays = await prisma.display.count();
  console.log(`   Displays: ${displays} (all reset to 'sold' status)`);
  
  const stores = await prisma.store.count();
  const customers = await prisma.customer.count();
  const staff = await prisma.staff.count();
  console.log(`   Stores: ${stores}`);
  console.log(`   Customers: ${customers}`);
  console.log(`   Staff: ${staff}`);

  console.log('\n✨ Cleanup complete! Ready for fresh activations.');
}

main()
  .catch((error) => {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
