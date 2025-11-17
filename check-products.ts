import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:QRD1splay16359@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres'
    }
  }
});

async function main() {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: {
      sku: true,
      name: true,
      productType: true,
      orgId: true,
    },
    orderBy: { sku: 'asc' }
  });
  
  console.log('All active products:\n');
  console.log('SKU\t\t\tName\t\t\t\t\tType\t\tOrgId');
  console.log('='.repeat(120));
  products.forEach(p => {
    console.log(`${p.sku}\t\t${p.name.padEnd(40)}\t${p.productType}\t${p.orgId}`);
  });
  
  console.log('\n\nSample products (SKU ends with -4):');
  const samples = products.filter(p => p.sku.endsWith('-4'));
  console.log(`Found ${samples.length} samples`);
  samples.forEach(p => console.log(`  - ${p.sku}: ${p.name}`));
}

main().finally(() => prisma.$disconnect());
