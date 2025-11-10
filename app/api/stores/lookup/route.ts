import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopifyCustomer, searchShopifyCustomers } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const displayId = searchParams.get('displayId');
    const shopifyCustomerId = searchParams.get('shopifyCustomerId');
    const storeId = searchParams.get('storeId');

    // Three modes:
    // 1. Search mode: requires query + displayId
    // 2. Lookup by Shopify customer: requires shopifyCustomerId only
    // 3. Get single store: requires storeId only
    
    if (storeId) {
      // Mode 3: Fetch complete store details by storeId
      const store = await prisma.store.findUnique({
        where: { storeId },
        select: {
          storeId: true,
          orgId: true,
          storeName: true,
          streetAddress: true,
          address2: true,
          city: true,
          state: true,
          zipCode: true,
          timezone: true,
          adminName: true,
          adminEmail: true,
          adminPhone: true,
          ownerName: true,
          ownerPhone: true,
          ownerEmail: true,
          purchasingManager: true,
          purchasingPhone: true,
          purchasingEmail: true,
          staffPin: true,
          promoOffer: true,
          returningCustomerPromo: true,
          shopifyCustomerId: true,
          availableSamples: true,
          availableProducts: true,
        },
      });

      return NextResponse.json({ store });
    }
    
    if (shopifyCustomerId) {
      // Mode 2: Find existing stores for this Shopify customer
      const stores = await prisma.store.findMany({
        where: {
          shopifyCustomerId: shopifyCustomerId,
        },
        select: {
          storeId: true,
          storeName: true,
          city: true,
          state: true,
          shopifyCustomerId: true,
        },
      });

      return NextResponse.json({
        shopifyCustomers: [],
        existingStores: stores.map(s => ({
          storeId: s.storeId,
          storeName: s.storeName,
          city: s.city,
          state: s.state,
        })),
      });
    }

    // Mode 1: Search for wholesale customers
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

    let shopifyCustomers: any[] = [];
    let existingStores = [];

    // Search our database for stores matching the query
    // Check store name, city, storeId, email, and phone (partial match)
    const stores = await prisma.store.findMany({
      where: {
        OR: [
          { storeId: { contains: query, mode: 'insensitive' } },
          { storeName: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { adminEmail: { contains: query, mode: 'insensitive' } },
          { adminPhone: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        storeId: true,
        storeName: true,
        city: true,
        state: true,
        shopifyCustomerId: true,
      },
      take: 50,
      orderBy: [
        { storeId: 'asc' }, // Sort by Store ID for easier browsing
      ],
    });

    existingStores = stores.map(s => ({
      storeId: s.storeId,
      storeName: s.storeName,
      city: s.city,
      state: s.state,
    }));

    // Only return existing stores - no Shopify search needed
    // Stores are created during onboarding, so they should already exist
    return NextResponse.json({
      shopifyCustomers: [], // No longer searching Shopify in this step
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
