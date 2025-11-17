import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-003' },
    include: {
      brandPartnerships: {
        include: {
          brand: {
            select: {
              orgId: true,
              name: true,
              shopifyStoreName: true,
              shopifyAccessToken: true,
            },
          },
        },
      },
    },
  });

  console.log('\n🏪 Store:', store?.storeId, store?.storeName);
  console.log('📊 Partnerships:', store?.brandPartnerships.length);
  
  store?.brandPartnerships.forEach((p) => {
    console.log('\n  🏷️  Brand:', p.brand.orgId, '-', p.brand.name);
    console.log('     Shopify domain:', p.brand.shopifyStoreName || '❌ MISSING');
    console.log('     Has token:', p.brand.shopifyAccessToken ? '✅ YES' : '❌ NO');
    console.log('     Token length:', p.brand.shopifyAccessToken?.length || 0);
  });

  await prisma.$disconnect();
}

check();
