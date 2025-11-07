import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopifyCustomer } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const businessName = searchParams.get('businessName');

    if (!email && !phone && !businessName) {
      return NextResponse.json(
        { error: 'Email, phone, or business name required' },
        { status: 400 }
      );
    }

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
      shopifyCustomer = await getShopifyCustomer(storeWithShopifyId.shopifyCustomerId);
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
        
        const searchResponse = await fetch(
          `${process.env.SHOPIFY_STORE_URL}/admin/api/2024-10/customers/search.json?query=${encodeURIComponent(query)}`,
          {
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
              'Content-Type': 'application/json',
            },
          }
        );

        if (searchResponse.ok) {
          const data = await searchResponse.json();
          if (data.customers && data.customers.length > 0) {
            // Take the first match
            const customer = data.customers[0];
            const defaultAddress = customer.default_address;
            shopifyCustomer = {
              id: customer.id.toString(),
              email: customer.email,
              phone: customer.phone || defaultAddress?.phone,
              firstName: customer.first_name,
              lastName: customer.last_name,
              companyName: defaultAddress?.company,
              // Flatten address for easy access
              address: defaultAddress?.address1,
              address2: defaultAddress?.address2,
              city: defaultAddress?.city,
              province: defaultAddress?.province,
              zip: defaultAddress?.zip,
              country: defaultAddress?.country,
            };
          }
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
