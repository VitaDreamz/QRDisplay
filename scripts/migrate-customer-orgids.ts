/**
 * Raw SQL migration to fix customer orgId references
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCustomerOrgIds() {
  console.log('🔧 Migrating customer orgId to use Organization.id...\n');
  
  // Get the VitaDreamz organization
  const org = await prisma.organization.findFirst({
    where: { name: 'VitaDreamz' }
  });
  
  if (!org) {
    console.error('❌ VitaDreamz organization not found!');
    process.exit(1);
  }
  
  console.log(`✅ Found organization: ${org.name}`);
  console.log(`   ID (CUID): ${org.id}`);
  console.log(`   orgId (string): ${org.orgId}\n`);
  
  try {
    // Step 1: Drop the existing foreign key constraint
    console.log('1️⃣  Dropping old foreign key constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE customers 
      DROP CONSTRAINT "customers_orgId_fkey";
    `);
    console.log('   ✅ Constraint dropped\n');
    
    // Step 2: Update all customer orgId values  
    console.log('2️⃣  Updating customer orgId values...');
    const result = await prisma.$executeRawUnsafe(`
      UPDATE customers 
      SET "orgId" = '${org.id}';
    `);
    console.log(`   ✅ Updated ${result} customers\n`);
    
    // Step 3: Add foreign key constraint referencing organizations.id
    console.log('3️⃣  Adding foreign key constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE customers 
      ADD CONSTRAINT "customers_orgId_fkey" 
      FOREIGN KEY ("orgId") REFERENCES organizations(id) 
      ON DELETE CASCADE;
    `);
    console.log('   ✅ Constraint added\n');
    
    console.log('🎉 Migration complete!');
    console.log(`\nAll customers now reference Organization.id (${org.id})`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

migrateCustomerOrgIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
