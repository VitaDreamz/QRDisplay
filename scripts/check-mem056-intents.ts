/**
 * Check purchase intents for MEM-056
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findUnique({
    where: { memberId: 'MEM-056' },
  });

  if (!customer) {
    console.log('Customer not found');
    return;
  }

  const intents = await prisma.purchaseIntent.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${intents.length} purchase intent(s) for MEM-056:\n`);
  
  for (const intent of intents) {
    console.log('Purchase Intent:', intent.id);
    console.log('  Status:', intent.status);
    console.log('  Product:', intent.productSku);
    console.log('  Final Price: $', intent.finalPrice.toString());
    console.log('  Discount:', intent.discountPercent + '%');
    console.log('  Created:', intent.createdAt);
    console.log('  Fulfilled:', intent.fulfilledAt || 'Not yet');
    console.log('  Fulfilled by Staff ID:', intent.fulfilledByStaffId || 'None (store admin)');
    console.log('');

    if (intent.fulfilledByStaffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: intent.fulfilledByStaffId },
        select: {
          firstName: true,
          lastName: true,
          staffPin: true,
          totalPoints: true,
          quarterlyPoints: true,
        }
      });
      console.log('  Fulfilled by:', staff);
      console.log('');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
