import prisma from '../lib/prisma';

async function testSuccessPage() {
  try {
    // Find the most recent customer
    const customer = await prisma.customer.findFirst({
      orderBy: { requestedAt: 'desc' }
    });
    
    if (!customer) {
      console.log('❌ No customers found in database');
      console.log('Create a customer by submitting a sample request at: http://localhost:3001/sample/QRD-001');
      return;
    }
    
    // Fetch store and organization data
    const store = await prisma.store.findUnique({
      where: { storeId: customer.storeId }
    });
    
    const organization = await prisma.organization.findUnique({
      where: { orgId: customer.orgId }
    });
    
    console.log('\n✅ Found customer data:');
    console.log('  Member ID:', customer.memberId);
    console.log('  Name:', customer.firstName, customer.lastName);
    console.log('  Sample:', customer.sampleChoice);
    console.log('\n📍 Store data:');
    console.log('  Store Name:', store?.storeName);
    console.log('  Promo Offer:', store?.promoOffer);
    console.log('\n🏢 Brand data:');
    console.log('  Brand Name:', organization?.name);
    console.log('  Support Email:', (organization as any)?.supportEmail || 'Not set');
    
    console.log('\n🔗 Test the success page at:');
    console.log(`   http://localhost:3001/sample/QRD-001/success?memberId=${customer.memberId}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSuccessPage();
