import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopifyCustomer, searchShopifyCustomers } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const displayId = searchParams.get('displayId');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!displayId) {
      return NextResponse.json(
        { error: 'Display ID required' },
        { status: 400 }
      );
    }

    // Get the display to find its organization
    const display = await prisma.display.findUnique({
      where: { displayId },
      include: { organization: true },
    });

    if (!display?.organization) {
      return NextResponse.json(
        { error: 'Display not found or not assigned to an organization' },
        { status: 404 }
      );
    }

    const org = display.organization;

    let shopifyCustomer = null;
    let existingStores = [];

    // Search our database for stores matching the query
    // Check email, phone, and business name (partial match)
    const stores = await prisma.store.findMany({
      where: {
        OR: [
          { adminEmail: { contains: query, mode: 'insensitive' } },
          { adminPhone: { contains: query, mode: 'insensitive' } },
          { storeName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        storeId: true,
        storeName: true,
        city: true,
        state: true,
        shopifyCustomerId: true,
      },
      take: 10, // Limit results
    });

    existingStores = stores.map(s => ({
      storeId: s.storeId,
      storeName: s.storeName,
      city: s.city,
      state: s.state,
    }));

    // If we found stores with a shopifyCustomerId, use that to fetch the Shopify customer
    const storeWithShopifyId = stores.find(s => s.shopifyCustomerId);
    
    if (storeWithShopifyId?.shopifyCustomerId) {
      // We have a Shopify customer ID from our database
      try {
        shopifyCustomer = await getShopifyCustomer(org, storeWithShopifyId.shopifyCustomerId);
      } catch (err) {
        console.error('Failed to get Shopify customer:', err);
        // Continue without Shopify customer
      }
    }

    // Also search Shopify directly
    try {
      const customers = await searchShopifyCustomers(org, query);
      if (customers.length > 0 && !shopifyCustomer) {
        // If we didn't find a Shopify customer from our database, use the search result
        shopifyCustomer = customers[0];
      }
    } catch (err) {
      console.error('Failed to search Shopify:', err);
      // Continue without Shopify customer
    }

    return NextResponse.json({
      shopifyCustomer,
      existingStores,
    });
  } catch (error) {
    console.error('Store lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup store' },
      { status: 500 }
    );
  }
}
