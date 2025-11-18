import prisma from '@/lib/prisma';

async function main() {
  const recent = await prisma.storeCreditTransaction.findMany({
    where: {
      createdAt: {
        gte: new Date('2025-11-18T00:00:00Z')
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      createdAt: true,
      reason: true,
      customerName: true,
      customerId: true,
      amount: true
    }
  });
  
  console.log('Recent transactions from Nov 18:');
  console.log(JSON.stringify(recent, null, 2));
  
  await prisma.$disconnect();
}

main();
