import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all PurchaseIntents for Jim's customers
  const intents = await prisma.purchaseIntent.findMany({
    where: {
      status: 'fulfilled',
      fulfilledByStaffId: {
        not: null
      }
    },
    include: {
      customer: {
        select: {
          memberId: true,
          firstName: true,
          lastName: true
        }
      },
      fulfilledByStaff: {
        select: {
          staffId: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { fulfilledAt: 'desc' },
    take: 10
  });
  
  console.log('\n=== Fulfilled Purchase Intents ===');
  console.log('Total:', intents.length);
  intents.forEach(i => {
    console.log(`\n${i.fulfilledAt?.toLocaleString()}`);
    console.log(`Customer: ${i.customer?.firstName} ${i.customer?.lastName} (${i.customer?.memberId})`);
    console.log(`Product: ${i.productSku}`);
    console.log(`Amount: $${i.finalPrice}`);
    console.log(`Staff: ${i.fulfilledByStaff?.firstName} ${i.fulfilledByStaff?.lastName}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
