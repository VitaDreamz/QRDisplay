import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopifyClient } from '@/lib/shopify';
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/subscription-tiers';

// Helper to generate a new Store ID with 3-digit minimum padding
function generateStoreId(nextIndex: number) {
  const paddedIndex = String(nextIndex).padStart(3, '0');
  return `SID-${paddedIndex}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessName,
      businessType,
      taxId,
      subscriptionTier = 'free' as SubscriptionTier,
      contactName,
      contactEmail,
      contactPhone,
      billingAddress1,
      billingAddress2,
      billingCity,
      billingState,
      billingZip,
      billingCountry,
      sameAsBilling,
      shippingAddress1,
      shippingAddress2,
      shippingCity,
      shippingState,
      shippingZip,
      shippingCountry,
      salesRepName,
      salesRepEmail,
      salesRepPhone,
      hearAboutUs,
      estimatedMonthlyVolume,
      notes,
    } = body;

    console.log('📝 Creating wholesale customer in Shopify:', businessName);

    // Get organization (for now hardcoded to VitaDreamz, can be dynamic later)
    const org = await prisma.organization.findUnique({
      where: { orgId: 'ORG-VITADREAMZ' },
    });

    if (!org || !org.shopifyStoreName || !org.shopifyAccessToken) {
      return NextResponse.json(
        { error: 'Shopify not connected for this organization' },
        { status: 400 }
      );
    }

    const { shopify, session } = getShopifyClient(org);
    const client = new shopify.clients.Rest({ session });

    // Prepare addresses
    const defaultAddress = {
      address1: billingAddress1,
      address2: billingAddress2 || undefined,
      city: billingCity,
      province: billingState,
      zip: billingZip,
      country: billingCountry,
      phone: contactPhone,
      company: businessName,
      name: contactName,
    };

    const addresses = [defaultAddress];

    // Add shipping address if different
    if (!sameAsBilling && shippingAddress1) {
      addresses.push({
        address1: shippingAddress1,
        address2: shippingAddress2 || undefined,
        city: shippingCity,
        province: shippingState,
        zip: shippingZip,
        country: shippingCountry,
        phone: contactPhone,
        company: businessName,
        name: contactName,
      });
    }

    // Create customer in Shopify
    const customerData: any = {
      first_name: contactName.split(' ')[0] || contactName,
      last_name: contactName.split(' ').slice(1).join(' ') || businessName,
      email: contactEmail,
      phone: contactPhone,
      tags: ['wholesale', businessType, salesRepName ? `rep:${salesRepName}` : ''].filter(Boolean).join(', '),
      note: [
        notes,
        salesRepName ? `Sales Rep: ${salesRepName}` : '',
        salesRepEmail ? `Rep Email: ${salesRepEmail}` : '',
        salesRepPhone ? `Rep Phone: ${salesRepPhone}` : '',
        hearAboutUs ? `Source: ${hearAboutUs}` : '',
        estimatedMonthlyVolume ? `Est. Monthly: ${estimatedMonthlyVolume}` : '',
        taxId ? `Tax ID: ${taxId}` : '',
      ].filter(Boolean).join('\n'),
      addresses: addresses,
      metafields: [
        {
          namespace: 'custom',
          key: 'business_name',
          value: businessName,
          type: 'single_line_text_field',
        },
        {
          namespace: 'custom',
          key: 'business_type',
          value: businessType,
          type: 'single_line_text_field',
        },
        salesRepName ? {
          namespace: 'custom',
          key: 'sales_rep_name',
          value: salesRepName,
          type: 'single_line_text_field',
        } : null,
        salesRepEmail ? {
          namespace: 'custom',
          key: 'sales_rep_email',
          value: salesRepEmail,
          type: 'single_line_text_field',
        } : null,
        salesRepPhone ? {
          namespace: 'custom',
          key: 'sales_rep_phone',
          value: salesRepPhone,
          type: 'single_line_text_field',
        } : null,
        taxId ? {
          namespace: 'custom',
          key: 'tax_id',
          value: taxId,
          type: 'single_line_text_field',
        } : null,
      ].filter(Boolean),
    };

    console.log('📝 Customer data prepared, creating in Shopify...');

    const response = await client.post({
      path: 'customers',
      data: {
        customer: customerData,
      },
    });

    const customer = (response.body as any).customer;

    console.log('✅ Customer created in Shopify:', customer.id);
    console.log('   Email:', customer.email);
    console.log('   Tags:', customer.tags);

    // Now create the Store record in our database
    console.log('📝 Creating Store record in database...');
    
    // Get the next store ID
    const storeCount = await prisma.store.count();
    const storeId = generateStoreId(storeCount + 1);
    
    // Get tier configuration for limits
    const tierConfig = SUBSCRIPTION_TIERS[subscriptionTier as SubscriptionTier];
    
    // Create store record
    const store = await prisma.store.create({
      data: {
        storeId,
        orgId: org.orgId,
        storeName: businessName,
        status: 'pending_activation', // Will be 'active' when display is linked
        
        // Contact information
        ownerName: contactName,
        ownerEmail: contactEmail,
        ownerPhone: contactPhone,
        
        // Admin (same as owner initially, can be updated during activation)
        adminName: contactName,
        adminEmail: contactEmail,
        adminPhone: contactPhone,
        
        // Purchasing (same as owner initially)
        purchasingManager: contactName,
        purchasingEmail: contactEmail,
        purchasingPhone: contactPhone,
        
        // Address
        streetAddress: billingAddress1,
        city: billingCity,
        state: billingState,
        zipCode: billingZip,
        
        // Shopify linkage
        shopifyCustomerId: customer.id.toString(),
        
        // Sales rep
        salesRepName,
        salesRepEmail,
        salesRepPhone,
        
        // Subscription tier and limits
        subscriptionTier: subscriptionTier as any,
        subscriptionStatus: 'active',
        customerSlotsGranted: tierConfig.features.newCustomersPerBilling,
        samplesPerQuarter: tierConfig.features.samplesPerQuarter,
        commissionRate: tierConfig.features.commissionRate,
        promoReimbursementRate: tierConfig.features.promoReimbursementRate,
        
        // Default settings (can be customized during activation)
        timezone: 'America/New_York',
        promoOffer: '20% Off In-Store Purchase',
        returningCustomerPromo: '10% Off In-Store Purchase',
        followupDays: [4, 7],
        postPurchaseFollowupDays: [45, 90],
      },
    });

    console.log('✅ Store record created:', store.storeId);
    console.log('   Tier:', subscriptionTier);
    console.log('   Customer slots:', tierConfig.features.newCustomersPerBilling);

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      email: customer.email,
      tags: customer.tags,
      storeId: store.storeId,
      storeName: store.storeName,
      subscriptionTier: subscriptionTier,
    });

  } catch (error: any) {
    console.error('❌ Error creating wholesale customer:', error);
    console.error('   Details:', error.response?.body || error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to create wholesale customer' },
      { status: 500 }
    );
  }
}
