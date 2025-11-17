import prisma from './lib/prisma';

async function checkRedemptionFlow() {
  console.log('\n🔍 CHECKING REDEMPTION FLOW\n');
  
  // Get the most recent PurchaseIntent
  const latestIntent = await prisma.purchaseIntent.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      product: true
    }
  });
  
  if (!latestIntent) {
    console.log('❌ No PurchaseIntents found');
    return;
  }
  
  console.log('📋 Latest PurchaseIntent:');
  console.log(`  ID: ${latestIntent.id}`);
  console.log(`  Created: ${latestIntent.createdAt}`);
  console.log(`  Status: ${latestIntent.status}`);
  console.log(`  Customer: ${latestIntent.customer.firstName} ${latestIntent.customer.lastName} (${latestIntent.customer.memberId})`);
  console.log(`  Product: ${latestIntent.product?.name || 'N/A'}`);
  console.log(`  Product SKU: ${latestIntent.productSku}`);
  console.log(`  Final Price: $${latestIntent.finalPrice}`);
  console.log(`  Promo Slug: ${latestIntent.promoSlug || 'N/A'}`);
  
  // Find the corresponding shortlink
  if (latestIntent.promoSlug) {
    const shortlink = await prisma.shortlink.findUnique({
      where: { slug: latestIntent.promoSlug }
    });
    
    if (shortlink) {
      console.log('\n🔗 Corresponding Shortlink:');
      console.log(`  Slug: ${shortlink.slug}`);
      console.log(`  Action: ${shortlink.action} ⚠️ THIS IS THE ISSUE!`);
      console.log(`  Created: ${shortlink.createdAt}`);
      console.log(`  Redeemed: ${shortlink.redeemed}`);
      console.log(`  Used At: ${shortlink.usedAt || 'Not used'}`);
      console.log(`  Member ID: ${shortlink.memberId}`);
      console.log(`  Store ID: ${shortlink.storeId}`);
      
      if (shortlink.action !== 'promo-redeem') {
        console.log('\n❌ PROBLEM FOUND:');
        console.log(`   Shortlink action is "${shortlink.action}" but should be "promo-redeem"`);
        console.log(`   This causes the redemption to go through the direct purchase flow instead of the promo flow`);
      }
    } else {
      console.log('\n❌ No shortlink found with slug:', latestIntent.promoSlug);
    }
  } else {
    console.log('\n❌ PurchaseIntent has no promoSlug');
  }
  
  // Check for corresponding PromoRedemption
  const redemption = await prisma.promoRedemption.findFirst({
    where: {
      customerId: latestIntent.customerId,
      storeId: latestIntent.storeId,
      redeemedAt: {
        gte: new Date(latestIntent.createdAt.getTime() - 1000 * 60 * 60) // Within 1 hour
      }
    },
    orderBy: { redeemedAt: 'desc' }
  });
  
  if (redemption) {
    console.log('\n✅ Found PromoRedemption:');
    console.log(`  Redeemed At: ${redemption.redeemedAt}`);
    console.log(`  Purchase Amount: $${redemption.purchaseAmount}`);
    console.log(`  Discount Amount: $${redemption.discountAmount}`);
  } else {
    console.log('\n❌ No PromoRedemption found for this PurchaseIntent');
  }
}

checkRedemptionFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
