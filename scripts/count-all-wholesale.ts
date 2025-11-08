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

    // Get total customer count first
    console.log('📊 Getting total customer count...\n');
    const countResponse = await fetch(
      `https://${shopifyStore}/admin/api/2024-01/customers/count.json`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json'
        }
      }
    );

    if (countResponse.ok) {
      const countData = await countResponse.json();
      console.log(`Total Customers in Shopify: ${countData.count}`);
    }

    // Search for wholesale customers with pagination
    let allWholesaleCustomers: any[] = [];
    let page = 1;
    let hasMore = true;
    const limit = 250; // Shopify's max limit

    console.log('\n🔍 Searching for wholesale customers (lastName:Wholesale)...\n');

    while (hasMore) {
      const response = await fetch(
        `https://${shopifyStore}/admin/api/2024-01/customers/search.json?query=last_name:Wholesale&limit=${limit}`,
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
        break;
      }

      const data = await response.json();
      const customers = data.customers || [];
      
      if (customers.length === 0) {
        hasMore = false;
      } else {
        allWholesaleCustomers = [...allWholesaleCustomers, ...customers];
        console.log(`Page ${page}: Found ${customers.length} customers (Total so far: ${allWholesaleCustomers.length})`);
        
        // Shopify search API doesn't use cursor pagination, it returns all matches at once
        hasMore = false;
      }
      
      page++;
    }

    console.log(`\n📊 Total Wholesale Customers Found: ${allWholesaleCustomers.length}\n`);

    // Show breakdown by state
    const byState: Record<string, number> = {};
    allWholesaleCustomers.forEach(c => {
      const state = c.default_address?.province || 'Unknown';
      byState[state] = (byState[state] || 0) + 1;
    });

    console.log('Breakdown by State:');
    Object.entries(byState)
      .sort((a, b) => b[1] - a[1])
      .forEach(([state, count]) => {
        console.log(`  ${state}: ${count}`);
      });

    // Show first 10
    console.log('\n\nFirst 10 customers:');
    allWholesaleCustomers.slice(0, 10).forEach((c: any, i: number) => {
      console.log(`\n${i + 1}. ${c.first_name} (ID: ${c.id})`);
      console.log(`   📍 ${c.default_address?.city || 'N/A'}, ${c.default_address?.province || 'N/A'}`);
      console.log(`   📧 ${c.email || 'N/A'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
