import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({
    where: { orgId: 'ORG-VITADREAMZ' },
    select: { 
      sku: true, 
      name: true, 
      active: true,
      id: true
    },
    orderBy: { sku: 'asc' }
  });
  
  console.log('\n📦 ALL VitaDreamz Products:\n');
  products.forEach(p => {
    const status = p.active ? '✅ ACTIVE' : '❌ INACTIVE';
    console.log(`  ${status} | ${p.sku.padEnd(15)} | ${p.name}`);
  });
  console.log(`\n📊 Total: ${products.length} products`);
  console.log(`   Active: ${products.filter(p => p.active).length}`);
  console.log(`   Inactive: ${products.filter(p => !p.active).length}`);
  
  // Show the IDs of the active wholesale boxes
  const activeWholesale = products.filter(p => p.active && p.sku.includes('-BX'));
  if (activeWholesale.length > 0) {
    console.log('\n⚠️  PROBLEM: These wholesale boxes are still ACTIVE:');
    activeWholesale.forEach(p => console.log(`     ${p.sku} - ID: ${p.id}`));
  }
}

check().finally(() => prisma.$disconnect());
