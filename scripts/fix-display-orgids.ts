/**
 * Fix display assignedOrgId to use Organization.id instead of Organization.orgId
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDisplayOrgIds() {
  console.log('🔧 Fixing display assignedOrgId values...\n');
  
  // Get the VitaDreamz organization
  const org = await prisma.organization.findFirst({
    where: { name: 'VitaDreamz' }
  });
  
  if (!org) {
    console.error('❌ VitaDreamz organization not found!');
    process.exit(1);
  }
  
  console.log(`✅ Organization: ${org.name}`);
  console.log(`   CUID: ${org.id}`);
  console.log(`   orgId: ${org.orgId}\n`);
  
  try {
    // Step 1: Drop constraint
    console.log('1️⃣  Dropping constraint...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE displays 
        DROP CONSTRAINT "displays_assignedOrgId_fkey";
      `);
      console.log('   ✅ Dropped\n');
    } catch (e: any) {
      if (e.message?.includes('does not exist')) {
        console.log('   ℹ️  Constraint doesn\'t exist\n');
      } else {
        throw e;
      }
    }
    
    // Step 2: Update assignedOrgId values
    console.log('2️⃣  Updating assignedOrgId values...');
    const result = await prisma.$executeRawUnsafe(`
      UPDATE displays 
      SET "assignedOrgId" = '${org.id}'
      WHERE "assignedOrgId" != '${org.id}';
    `);
    console.log(`   ✅ Updated ${result} displays\n`);
    
    // Step 3: Add constraint
    console.log('3️⃣  Adding constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE displays 
      ADD CONSTRAINT "displays_assignedOrgId_fkey" 
      FOREIGN KEY ("assignedOrgId") REFERENCES organizations(id) 
      ON DELETE CASCADE;
    `);
    console.log('   ✅ Constraint added\n');
    
    console.log(`✅ All displays now use assignedOrgId: ${org.id}`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

fixDisplayOrgIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
