import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:QRD1splay16359@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres'
    }
  }
});

async function main() {
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-003' },
    select: {
      storeId: true,
      storeName: true,
      orgId: true,
    }
  });
  
  console.log('Store SID-003:', store);
  
  // Also check all partnerships
  const partnerships = await prisma.storeBrandPartnership.findMany({
    where: { storeId: 'SID-003' },
    select: {
      id: true,
      brandId: true,
      storeId: true,
      active: true
    }
  });
  
  console.log('\nBrand Partnerships for SID-003:', partnerships);
}

main().finally(() => prisma.$disconnect());
