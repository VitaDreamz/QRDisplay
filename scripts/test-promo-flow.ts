import prisma from '@/lib/prisma';

async function testPromoFlow() {
  console.log('🧪 Testing Promo Redemption Flow\n');

  // 1. Find a customer with a promo slug
  const customer = await prisma.customer.findFirst({
    where: {
      promoSlug: { not: null }
    },
    include: {
      store: true
    }
  });

  if (!customer) {
    console.log('❌ No customers with promo slugs found.');
    console.log('👉 Create a sample request first via /sample/DIS-XXXXX\n');
    return;
  }

  console.log('✅ Found customer with promo slug:');
  console.log(`   Name: ${customer.firstName} ${customer.lastName}`);
  console.log(`   Member ID: ${customer.memberId}`);
  console.log(`   Store: ${customer.store?.storeName}`);
  console.log(`   Promo Slug: ${customer.promoSlug}`);
  console.log(`   Promo Redeemed: ${customer.promoRedeemed ? 'Yes ✓' : 'No'}\n`);

  // 2. Check if promo already redeemed
  if (customer.promoRedeemed) {
    console.log('⚠️  This promo has already been redeemed.');
    console.log(`   Redeemed at: ${customer.promoRedeemedAt}\n`);
    
    // Show PromoRedemption record
    const redemption = await prisma.promoRedemption.findFirst({
      where: { promoSlug: customer.promoSlug! }
    });
    
    if (redemption) {
      console.log('📝 PromoRedemption record:');
      console.log(`   Offer: ${redemption.promoOffer}`);
      console.log(`   Redeemed by: ${redemption.redeemedBy}`);
      console.log(`   Purchase Amount: ${redemption.purchaseAmount || 'N/A'}`);
      console.log(`   Discount Amount: ${redemption.discountAmount || 'N/A'}\n`);
    }
  } else {
    console.log('📋 To test promo redemption:');
    console.log(`   1. Visit: http://localhost:3001/p/${customer.promoSlug}`);
    console.log(`   2. Enter Store PIN: ${customer.store?.staffPin || '(check store record)'}`);
    console.log(`   3. Click "Redeem Promo"`);
    console.log(`   4. Should see success screen\n`);
  }

  // 3. Check shortlink
  const shortlink = await prisma.shortlink.findFirst({
    where: { slug: customer.promoSlug! }
  });

  if (shortlink) {
    console.log('🔗 Shortlink status:');
    console.log(`   Action: ${shortlink.action}`);
    console.log(`   Requires PIN: ${shortlink.requiresPin ? 'Yes' : 'No'}`);
    console.log(`   Used: ${shortlink.usedAt ? 'Yes ✓' : 'No'}`);
    console.log(`   Created: ${shortlink.createdAt}`);
    
    // Check expiration
    const hoursSinceCreated = (Date.now() - new Date(shortlink.createdAt).getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, 72 - hoursSinceCreated);
    console.log(`   Expires in: ${hoursRemaining.toFixed(1)} hours\n`);
  }

  // 4. Show stats
  const totalPromoRedemptions = await prisma.promoRedemption.count();
  const totalRedeemedSamples = await prisma.customer.count({
    where: { redeemed: true }
  });

  console.log('📊 Overall Promo Stats:');
  console.log(`   Total Promo Redemptions: ${totalPromoRedemptions}`);
  console.log(`   Total Redeemed Samples: ${totalRedeemedSamples}`);
  if (totalRedeemedSamples > 0) {
    const conversion = Math.round((totalPromoRedemptions / totalRedeemedSamples) * 100);
    console.log(`   Conversion Rate: ${conversion}%\n`);
  }
}

testPromoFlow()
  .then(() => {
    console.log('✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
