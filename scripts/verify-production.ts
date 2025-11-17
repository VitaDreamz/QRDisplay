/**
 * Verify production database final status
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
  console.log('\n=== PRODUCTION DATABASE FINAL STATUS ===\n');
  
  const brands = await prisma.organization.findMany({
    where: { type: 'client' },
    orderBy: { name: 'asc' }
  });

  for (const brand of brands) {
    const products = await prisma.product.findMany({
      where: { orgId: brand.orgId },
      select: { sku: true, name: true, active: true }
    });

    console.log(`${brand.orgId} - ${brand.name}`);
    console.log(`  Shopify: ${brand.shopifyStoreName || 'NOT SET'}`);
    console.log(`  Token: ${brand.shopifyAccessToken ? 'SET' : 'NOT SET'}`);
    console.log(`  Active: ${brand.shopifyActive ? 'YES' : 'NO'}`);
    console.log(`  Products: ${products.length}`);
    products.forEach(p => console.log(`    - ${p.sku}: ${p.name} [Active: ${p.active}]`));
    console.log('');
  }

  console.log('✅ Production database is ready!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
