import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const orgId = searchParams.get('orgId');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId parameter is required' },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json({ customers: [] });
    }

    // Get organization's Shopify credentials
    const org = await prisma.organization.findUnique({
      where: { orgId },
      select: {
        shopifyStoreName: true,
        shopifyAccessToken: true
      }
    });

    if (!org?.shopifyStoreName || !org?.shopifyAccessToken) {
      return NextResponse.json(
        { error: 'Shopify not configured for this organization' },
        { status: 400 }
      );
    }

    // Search Shopify customers
    const shopifyResponse = await fetch(
      `https://${org.shopifyStoreName}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Shopify-Access-Token': org.shopifyAccessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('Shopify API error:', shopifyResponse.status, errorText);
      throw new Error(`Failed to search Shopify customers: ${shopifyResponse.status} - ${errorText}`);
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
