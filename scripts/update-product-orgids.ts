/**
 * Update product orgIds in production to match new brand orgIds
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:QRD1splay16359@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres"
    }
  }
});

async function main() {
  console.log('\n🔧 Updating product orgIds in production...\n');

  const updates = [
    { oldOrgId: 'cmi-slumber', newOrgId: 'ORG-VSCA1', name: 'VitaDreamz Slumber' },
    { oldOrgId: 'cmi-bliss', newOrgId: 'ORG-VBDOW', name: 'VitaDreamz Bliss' },
    { oldOrgId: 'cmi-chill', newOrgId: 'ORG-VCVR4', name: 'VitaDreamz Chill' },
  ];

  for (const update of updates) {
    const result = await prisma.product.updateMany({
      where: { orgId: update.oldOrgId },
      data: { orgId: update.newOrgId }
    });
    console.log(`✅ Updated ${result.count} products from ${update.oldOrgId} to ${update.newOrgId} (${update.name})`);
  }

  console.log('\n📊 Verifying updates...\n');

  const brands = await prisma.organization.findMany({
    where: { type: 'client' }
  });

  for (const brand of brands) {
    const productCount = await prisma.product.count({
      where: { orgId: brand.orgId }
    });
    const products = await prisma.product.findMany({
      where: { orgId: brand.orgId },
      select: { sku: true, name: true }
    });
    
    console.log(`${brand.orgId} - ${brand.name}: ${productCount} products`);
    products.forEach(p => console.log(`  - ${p.sku}: ${p.name}`));
    console.log('');
  }

  console.log('✨ Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
