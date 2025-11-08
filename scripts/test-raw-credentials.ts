import prisma from '../lib/prisma';

async function main() {
  try {
    const org = await prisma.organization.findUnique({
      where: { orgId: 'ORG-VITADREAMZ' },
      select: {
        shopifyStoreName: true,
        shopifyAccessToken: true
      }
    });

    if (!org) {
      console.log('❌ Organization not found');
      return;
    }

    console.log('Raw values from database:');
    console.log('Store Name:', org.shopifyStoreName);
    console.log('\nAccess Token:', org.shopifyAccessToken);

    // Try using them directly (maybe they're not encrypted yet?)
    if (org.shopifyStoreName && org.shopifyAccessToken) {
      console.log('\n\nTrying API call with raw values...');
      const response = await fetch(
        `https://${org.shopifyStoreName}/admin/api/2024-01/customers/count.json`,
        {
          headers: {
            'X-Shopify-Access-Token': org.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ API call successful! Customer count:', data.count);
        console.log('\n⚠️  Values are stored UNENCRYPTED in database!');
      } else {
        const error = await response.text();
        console.log('❌ API call failed:', response.status);
        console.log('Error:', error.substring(0, 200));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
