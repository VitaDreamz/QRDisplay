import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopifyCustomer, searchShopifyCustomers } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const businessName = searchParams.get('businessName');
    const displayId = searchParams.get('displayId');

    if (!email && !phone && !businessName) {
      return NextResponse.json(
        { error: 'Email, phone, or business name required' },
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

    // First, check if we have any stores in our database with this email/phone/businessName
    const storeQuery: any = {
      OR: [],
    };
    
    if (email) storeQuery.OR.push({ adminEmail: email });
    if (phone) storeQuery.OR.push({ adminPhone: phone });
    if (businessName) {
      // Partial match on store name
      storeQuery.OR.push({ 
        storeName: { 
          contains: businessName, 
          mode: 'insensitive' 
        } 
      });
    }

    const stores = await prisma.store.findMany({
      where: storeQuery,
      select: {
        storeId: true,
        storeName: true,
        city: true,
        state: true,
        shopifyCustomerId: true,
      },
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
    } else {
      // Try to find customer in Shopify by email/phone/businessName
      try {
        let query = '';
        if (businessName) {
          // Search by first_name (business name in our convention)
          query = businessName;
        } else {
          query = email || phone || '';
        }
        
        const customers = await searchShopifyCustomers(org, query);
        if (customers.length > 0) {
          // Take the first match
          shopifyCustomer = customers[0];
        }
      } catch (err) {
        console.error('Failed to search Shopify:', err);
        // Continue without Shopify customer
      }
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
