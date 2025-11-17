import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get the most recent promo redemption
  const promo = await prisma.promoRedemption.findFirst({
    orderBy: { redeemedAt: 'desc' },
    include: {
      customer: {
        select: {
          memberId: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });
  
  if (!promo) {
    console.log('No promo redemptions found');
    return;
  }
  
  console.log('\n=== Most Recent Promo Redemption ===');
  console.log('Redeemed At:', promo.redeemedAt?.toLocaleString());
  console.log('Customer:', promo.customer?.firstName, promo.customer?.lastName);
  console.log('Purchase Amount:', promo.purchaseAmount);
  console.log('Discount Amount:', promo.discountAmount);
  console.log('Staff ID:', promo.redeemedByStaffId);
  
  // Check if points were awarded
  if (promo.redeemedByStaffId) {
    const points = await prisma.staffPointTransaction.findFirst({
      where: {
        staffId: promo.redeemedByStaffId,
        createdAt: {
          gte: new Date(promo.redeemedAt!.getTime() - 5000),
          lte: new Date(promo.redeemedAt!.getTime() + 5000)
        }
      }
    });
    
    if (points) {
      console.log('\n✅ Points awarded:', points.points);
    } else {
      console.log('\n❌ NO POINTS AWARDED');
    }
    
    // Check staff salesGenerated
    const staff = await prisma.staff.findUnique({
      where: { id: promo.redeemedByStaffId },
      select: { staffId: true, salesGenerated: true }
    });
    
    console.log('Staff Sales Count:', staff?.salesGenerated);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
