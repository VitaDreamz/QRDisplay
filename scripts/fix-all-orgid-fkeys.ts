/**
 * Fix ALL orgId foreign keys to reference organizations.id instead of organizations.orgId
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllOrgIdReferences() {
  console.log('🔧 Fixing all orgId foreign key references...\n');
  
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
  
  const tables = [
    { name: 'conversions', constraint: 'conversions_orgId_fkey' },
    { name: 'shopify_webhook_logs', constraint: 'shopify_webhook_logs_orgId_fkey' },
  ];
  
  for (const table of tables) {
    console.log(`📋 Processing table: ${table.name}`);
    
    try {
      // Step 1: Drop constraint
      console.log(`   1️⃣  Dropping constraint ${table.constraint}...`);
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE ${table.name} 
          DROP CONSTRAINT "${table.constraint}";
        `);
        console.log(`      ✅ Dropped`);
      } catch (e: any) {
        if (e.message?.includes('does not exist')) {
          console.log(`      ℹ️  Constraint doesn't exist, skipping`);
        } else {
          throw e;
        }
      }
      
      // Step 2: Update orgId values
      console.log(`   2️⃣  Updating orgId values...`);
      const result = await prisma.$executeRawUnsafe(`
        UPDATE ${table.name} 
        SET "orgId" = '${org.id}'
        WHERE "orgId" != '${org.id}';
      `);
      console.log(`      ✅ Updated ${result} rows`);
      
      // Step 3: Add new constraint
      console.log(`   3️⃣  Adding new constraint...`);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE ${table.name} 
        ADD CONSTRAINT "${table.constraint}" 
        FOREIGN KEY ("orgId") REFERENCES organizations(id) 
        ON DELETE CASCADE;
      `);
      console.log(`      ✅ Constraint added\n`);
      
    } catch (error) {
      console.error(`   ❌ Error processing ${table.name}:`, error);
      throw error;
    }
  }
  
  console.log('🎉 All foreign keys fixed!');
  console.log(`\nAll tables now reference Organization.id (${org.id})`);
}

fixAllOrgIdReferences()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
