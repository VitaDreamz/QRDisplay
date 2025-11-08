import { config } from 'dotenv';
import prisma from '../lib/prisma';
import { decryptSafe } from '../lib/encryption';

// Load environment variables
config({ path: '.env.local' });

async function main() {
  try {
    const org = await prisma.organization.findUnique({
      where: { orgId: 'ORG-VITADREAMZ' },
      select: {
        shopifyStoreName: true,
        shopifyAccessToken: true
      }
    });

    if (!org?.shopifyStoreName || !org?.shopifyAccessToken) {
      console.log('❌ Shopify not configured');
      return;
    }

    const shopifyStore = org.shopifyStoreName;
    const shopifyToken = decryptSafe(org.shopifyAccessToken);

    if (!shopifyStore || !shopifyToken) {
      console.log('❌ Failed to decrypt credentials');
      return;
    }

    console.log(`✅ Shopify Store: ${shopifyStore}\n`);
    console.log('🔍 Using GraphQL API to get accurate count...\n');

    let allCustomers: any[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    let pageCount = 0;

    while (hasNextPage) {
      pageCount++;
      
      const query = `
        query ($cursor: String) {
          customers(first: 250, after: $cursor, query: "last_name:Wholesale") {
            edges {
              node {
                id
                legacyResourceId
                firstName
                lastName
                email
                phone
                defaultAddress {
                  city
                  provinceCode
                  address1
                  zip
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const response = await fetch(
        `https://${shopifyStore}/admin/api/2024-01/graphql.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            variables: { cursor }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.log('❌ GraphQL API Error:', response.status, error);
        break;
      }

      const data = await response.json();
      
      if (data.errors) {
        console.log('❌ GraphQL Errors:', JSON.stringify(data.errors, null, 2));
        break;
      }

      const customers = data.data.customers.edges.map((edge: any) => edge.node);
      allCustomers = [...allCustomers, ...customers];
      
      console.log(`Page ${pageCount}: Found ${customers.length} customers (Total: ${allCustomers.length})`);

      hasNextPage = data.data.customers.pageInfo.hasNextPage;
      cursor = data.data.customers.pageInfo.endCursor;
    }

    console.log(`\n✅ Total Wholesale Customers: ${allCustomers.length}\n`);

    // Breakdown by state
    const byState: Record<string, number> = {};
    allCustomers.forEach(c => {
      const state = c.defaultAddress?.provinceCode || 'Unknown';
      byState[state] = (byState[state] || 0) + 1;
    });

    console.log('Breakdown by State (Top 10):');
    Object.entries(byState)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
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
