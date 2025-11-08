import { config } from 'dotenv';
import prisma from '../lib/prisma';
import { decryptSafe } from '../lib/encryption';

config({ path: '.env.local' });

async function main() {
  try {
    const org = await prisma.organization.findUnique({
      where: { orgId: 'ORG-VITADREAMZ' },
      select: { shopifyStoreName: true, shopifyAccessToken: true }
    });

    const shopifyStore = org!.shopifyStoreName;
    const shopifyToken = decryptSafe(org!.shopifyAccessToken!);

    console.log('🔍 Fetching ALL customers and filtering by lastName...\n');

    let allWholesaleCustomers: any[] = [];
    let pageInfo: string | undefined;
    let pageCount = 0;

    while (true) {
      pageCount++;
      
      // Use the customers.json endpoint with pagination
      const url = pageInfo 
        ? `https://${shopifyStore}/admin/api/2024-01/customers.json?limit=250&page_info=${pageInfo}`
        : `https://${shopifyStore}/admin/api/2024-01/customers.json?limit=250`;

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': shopifyToken!,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log('❌ API Error:', response.status, await response.text());
        break;
      }

      const data = await response.json();
      const customers = data.customers || [];
      
      // Filter for wholesale customers
      const wholesaleCustomers = customers.filter((c: any) => 
        c.last_name?.toLowerCase() === 'wholesale'
      );
      
      allWholesaleCustomers = [...allWholesaleCustomers, ...wholesaleCustomers];
      
      console.log(`Page ${pageCount}: ${wholesaleCustomers.length}/${customers.length} wholesale (Total wholesale: ${allWholesaleCustomers.length})`);

      // Check for next page using Link header
      const linkHeader = response.headers.get('Link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        // Extract page_info from Link header
        const match = linkHeader.match(/page_info=([^&>]+)/);
        if (match) {
          pageInfo = match[1];
        } else {
          break;
        }
      } else {
        break;
      }

      // Safety limit
      if (pageCount >= 60) {
        console.log('\n⚠️  Reached page limit (60 pages = 15,000 customers)');
        break;
      }
    }

    console.log(`\n✅ Total Wholesale Customers: ${allWholesaleCustomers.length}`);
    console.log(`📄 Total Pages Fetched: ${pageCount}\n`);

    // Breakdown by state
    const byState: Record<string, number> = {};
    allWholesaleCustomers.forEach(c => {
      const state = c.default_address?.province || 'Unknown';
      byState[state] = (byState[state] || 0) + 1;
    });

    console.log('Top 15 States:');
    Object.entries(byState)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([state, count]) => {
        console.log(`  ${state}: ${count}`);
      });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
