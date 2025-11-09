/**
 * Fix customer orgId to use actual organization CUID instead of string
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCustomerOrgIds() {
  console.log('🔧 Fixing customer orgId values...\n');
  
  // Get the VitaDreamz organization
  const org = await prisma.organization.findFirst({
    where: { name: 'VitaDreamz' }
  });
  
  if (!org) {
    console.error('❌ VitaDreamz organization not found!');
    process.exit(1);
  }
  
  console.log(`✅ Found organization: ${org.name} (${org.id})\n`);
  
  // Find all customers with wrong orgId
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { orgId: 'ORG-VITADREAMZ' },
        { orgId: { not: org.id } }
      ]
    }
  });
  
  console.log(`Found ${customers.length} customers with incorrect orgId\n`);
  
  if (customers.length === 0) {
    console.log('✅ All customers already have correct orgId!');
    return;
  }
  
  // Update all customers
  const result = await prisma.customer.updateMany({
    where: {
      OR: [
        { orgId: 'ORG-VITADREAMZ' },
        { orgId: { not: org.id } }
      ]
    },
    data: {
      orgId: org.id
    }
  });
  
  console.log(`✅ Updated ${result.count} customers to use orgId: ${org.id}`);
  console.log('\n🎉 Migration complete!');
}

fixCustomerOrgIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
