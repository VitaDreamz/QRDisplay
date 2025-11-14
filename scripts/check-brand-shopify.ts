import prisma from './lib/prisma.js';

async function checkBrands() {
  const brands = await prisma.organization.findMany({
    where: {
      orgId: { in: ['ORG-VSV3I', 'ORG-VBEN2', 'ORG-VC9L4'] }
    },
    select: {
      orgId: true,
      name: true,
      shopifyStoreName: true,
      shopifyAccessToken: true,
      shopifyActive: true,
    }
  });
  
  console.log('\n📦 Brands in database:');
  brands.forEach(b => {
    console.log({
      orgId: b.orgId,
      name: b.name,
      shopifyStoreName: b.shopifyStoreName,
      hasToken: !!b.shopifyAccessToken,
      tokenLength: b.shopifyAccessToken?.length,
      shopifyActive: b.shopifyActive,
    });
  });
  
  await prisma.$disconnect();
}

checkBrands();
