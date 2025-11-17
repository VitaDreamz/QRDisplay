import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({
    select: { sku: true, orgId: true }
  });
  
  const orgs = await prisma.organization.findMany({
    select: { orgId: true, name: true }
  });
  
  const orgIds = new Set(orgs.map(o => o.orgId));
  const orphaned = products.filter(p => !orgIds.has(p.orgId));
  
  console.log('\n🔍 Checking Product → Organization References:\n');
  console.log('Total products:', products.length);
  console.log('Total organizations:', orgs.length);
  console.log('Orphaned products (no matching org):', orphaned.length);
  
  if (orphaned.length > 0) {
    console.log('\n❌ PROBLEM - These products have invalid orgIds:');
    orphaned.forEach(p => console.log('  ', p.sku, '→', p.orgId));
    console.log('\n⚠️  CANNOT ADD FOREIGN KEY - Fix these first!');
  } else {
    console.log('\n✅ All products have valid organization references');
    console.log('✅ SAFE TO ADD FOREIGN KEY RELATION\n');
  }
  
  await prisma.$disconnect();
}

check();
