import prisma from '../lib/prisma';

async function main() {
  try {
    const org = await prisma.organization.findUnique({
      where: { orgId: 'ORG-VITADREAMZ' },
      select: {
        orgId: true,
        name: true,
        shopifyStoreName: true,
        shopifyAccessToken: true,
        shopifyApiKey: true,
        shopifyApiSecret: true
      }
    });

    if (!org) {
      console.log('❌ Organization not found');
      return;
    }

    console.log('Organization:', org.name);
    console.log('Store Name:', org.shopifyStoreName || '(not set)');
    console.log('Access Token:', org.shopifyAccessToken ? `${org.shopifyAccessToken.substring(0, 10)}... (${org.shopifyAccessToken.length} chars)` : '(not set)');
    console.log('API Key:', org.shopifyApiKey ? `${org.shopifyApiKey.substring(0, 10)}... (${org.shopifyApiKey.length} chars)` : '(not set)');
    console.log('API Secret:', org.shopifyApiSecret ? '****** (set)' : '(not set)');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
