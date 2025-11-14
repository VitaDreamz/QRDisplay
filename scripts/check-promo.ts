import prisma from '../lib/prisma';

async function main() {
  const bp = await prisma.storeBrandPartnership.findFirst({ 
    include: { brand: true } 
  });
  
  console.log('Sample partnership:');
  console.log({
    name: bp?.brand.name,
    promo: bp?.promoCommission,
    online: bp?.onlineCommission,
    sub: bp?.subscriptionCommission
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
