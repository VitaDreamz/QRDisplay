import { config } from 'dotenv';
import prisma from '../lib/prisma';
import { decryptSafe } from '../lib/encryption';

// Load environment variables
config({ path: '.env.local' });

async function main() {
  try {
    // Get VitaDreamz org with Shopify credentials
    const org = await prisma.organization.findUnique({
      where: { orgId: 'ORG-VITADREAMZ' },
      select: {
        shopifyStoreName: true,
        shopifyAccessToken: true
      }
    });

    if (!org?.shopifyStoreName || !org?.shopifyAccessToken) {
      console.log('❌ Shopify not configured for VitaDreamz');
      return;
    }

    // Decrypt the access token (store name is NOT encrypted)
    const shopifyStore = org.shopifyStoreName; // Plain text
    const shopifyToken = decryptSafe(org.shopifyAccessToken); // Encrypted

    if (!shopifyStore || !shopifyToken) {
      console.log('❌ Failed to decrypt Shopify credentials');
      return;
    }

    console.log(`✅ Shopify Store: ${shopifyStore}\n`);

    // Search for wholesale customers
    const response = await fetch(
      `https://${shopifyStore}/admin/api/2024-01/customers/search.json?query=last_name:Wholesale`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.log('❌ Shopify API Error:', response.status, error);
      return;
    }

    const data = await response.json();
    const customers = data.customers || [];

    console.log(`📊 Wholesale Customers Found: ${customers.length}\n`);

    if (customers.length > 0) {
      console.log('First 5 customers:\n');
      customers.slice(0, 5).forEach((c: any, i: number) => {
        console.log(`${i + 1}. ${c.first_name} (ID: ${c.id})`);
        console.log(`   📍 ${c.default_address?.city || 'N/A'}, ${c.default_address?.province || 'N/A'}`);
        console.log(`   📧 ${c.email || 'N/A'}`);
        console.log(`   📞 ${c.phone || c.default_address?.phone || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No wholesale customers found in Shopify');
      console.log('   Wholesale customers should have lastName="Wholesale"');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
