import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({
    where: { orgId: { in: ['ORG-VCVR4', 'ORG-VBDOW', 'ORG-VSCA1'] } },
    select: { sku: true, name: true, imageUrl: true }
  });
  
  console.log('Products and their images:');
  products.forEach(p => {
    console.log(`${p.sku}: ${p.name}`);
    console.log(`  Image: ${p.imageUrl || 'NO IMAGE'}`);
  });
  
  await prisma.$disconnect();
}

check();
