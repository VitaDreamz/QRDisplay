import prisma from '../lib/prisma';

async function main() {
  console.log('Updating brand partnerships with default promo commission...');

  const updated = await prisma.storeBrandPartnership.updateMany({
    data: {
      promoCommission: 50.0
    }
  });

  console.log(`✅ Updated ${updated.count} brand partnerships with 50% promo commission`);

  // Verify
  const partnerships = await prisma.storeBrandPartnership.findMany({
    include: {
      brand: {
        select: {
          name: true
        }
      }
    }
  });

  console.log('\nBrand Partnerships:');
  partnerships.forEach(bp => {
    console.log(`  ${bp.brand.name}: Promo ${bp.promoCommission}%, Online ${bp.onlineCommission}%, Subscription ${bp.subscriptionCommission}%`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
