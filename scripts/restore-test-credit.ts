import prisma from '../lib/prisma';

async function main() {
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-013' }
  });
  
  if (!store) {
    console.log('Store not found');
    return;
  }
  
  const newBalance = 10;
  
  await prisma.$transaction([
    prisma.store.update({
      where: { id: store.id },
      data: { storeCredit: newBalance }
    }),
    prisma.storeCreditTransaction.create({
      data: {
        storeId: store.id,
        amount: 10,
        type: 'earned',
        reason: 'Test credit restore',
        balance: newBalance
      }
    })
  ]);
  
  console.log('✅ Added $10 credit back to SID-013 for testing');
  console.log('New balance: $10.00');
  
  await prisma.$disconnect();
}

main();
