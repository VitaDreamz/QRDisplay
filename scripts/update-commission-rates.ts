import prisma from '../lib/prisma';

async function updateCommissionRates() {
  console.log('📊 Updating commission rates for all brand partnerships...\n');

  const partnerships = await prisma.storeBrandPartnership.findMany({
    include: {
      brand: { select: { name: true } }
    }
  });

  console.log(`Found ${partnerships.length} partnerships\n`);

  for (const partnership of partnerships) {
    await prisma.storeBrandPartnership.update({
      where: { id: partnership.id },
      data: {
        onlineCommission: 20.0,
        subscriptionCommission: 5.0
      }
    });

    console.log(`✅ Updated ${partnership.brand.name}`);
    console.log(`   Online Commission: 20%`);
    console.log(`   Subscription Commission: 5%\n`);
  }

  console.log('✅ All commission rates updated!');
}

updateCommissionRates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
