/**
 * Check staff at store SID-027
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-027' },
    select: {
      storeId: true,
      storeName: true,
      staffPin: true,
    }
  });

  console.log('Store:', store);

  const staff = await prisma.staff.findMany({
    where: { storeId: 'SID-027' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      staffPin: true,
      totalPoints: true,
      quarterlyPoints: true,
    }
  });

  console.log(`\nStaff members at ${store?.storeName}:`);
  staff.forEach(s => {
    console.log(`  ${s.firstName} ${s.lastName} - PIN: ${s.staffPin} - Points: ${s.totalPoints}`);
  });

  // Also check where staff with PIN 6147 is
  const targetStaff = await prisma.staff.findFirst({
    where: { staffPin: '6147' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      staffPin: true,
      storeId: true,
      store: {
        select: {
          storeId: true,
          storeName: true,
        }
      }
    }
  });

  console.log('\n\nStaff member with PIN 6147:');
  console.log(targetStaff);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
