import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_STORE = process.env.SHOPIFY_STORE!;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json({ customers: [] });
    }

    // Search Shopify customers
    const shopifyResponse = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!shopifyResponse.ok) {
      throw new Error('Failed to search Shopify customers');
    }

    const data = await shopifyResponse.json();
    
    if (!data.customers || data.customers.length === 0) {
      return NextResponse.json({ customers: [] });
    }

    // Filter to wholesale customers only (lastName = "Wholesale")
    const wholesaleCustomers = data.customers
      .filter((c: any) => c.last_name?.toLowerCase() === 'wholesale')
      .map((customer: any) => ({
        id: customer.id.toString(),
        email: customer.email,
        firstName: customer.first_name, // Business name
        lastName: customer.last_name,
        phone: customer.phone || customer.default_address?.phone,
        companyName: customer.company,
        city: customer.default_address?.city,
        province: customer.default_address?.province,
        address: customer.default_address?.address1,
        zip: customer.default_address?.zip,
        country: customer.default_address?.country
      }));
    
    return NextResponse.json({ customers: wholesaleCustomers });

  } catch (error) {
    console.error('Error searching Shopify customers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search customers' },
      { status: 500 }
    );
  }
}
