import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get Jim Bonutto's staff record
  const staff = await prisma.staff.findFirst({
    where: {
      firstName: 'Jim',
      lastName: 'Bonutto'
    }
  });
  
  if (!staff) {
    console.log('Staff not found');
    return;
  }
  
  console.log('\n=== Staff Record ===');
  console.log('Staff ID:', staff.staffId);
  console.log('Sales Generated:', staff.salesGenerated);
  console.log('Total Points:', staff.totalPoints);
  
  // Check staff point transactions
  const points = await prisma.staffPointTransaction.findMany({
    where: { staffId: staff.id },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\n=== Point Transactions ===');
  console.log('Total transactions:', points.length);
  points.forEach(p => {
    console.log(`${p.createdAt.toLocaleString()}: ${p.points} points (${p.type}) - ${p.reason}`);
  });
  
  // Check PromoRedemptions
  const promos = await prisma.promoRedemption.findMany({
    where: {
      redeemedByStaffId: staff.id
    },
    include: {
      customer: {
        select: {
          memberId: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { redeemedAt: 'desc' }
  });
  
  console.log('\n=== Promo Redemptions ===');
  console.log('Total:', promos.length);
  promos.forEach(p => {
    console.log(`${p.redeemedAt?.toLocaleString()}: ${p.customer?.firstName} ${p.customer?.lastName} - $${p.purchaseAmount}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
