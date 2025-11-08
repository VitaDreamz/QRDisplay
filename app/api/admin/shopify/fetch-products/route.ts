import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopifyClient } from '@/lib/shopify';

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await request.json();

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Get organization with Shopify credentials
    const org = await prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!org.shopifyStoreName || !org.shopifyAccessToken) {
      return NextResponse.json(
        { error: 'Shopify not connected for this organization' },
        { status: 400 }
      );
    }

    console.log('📦 [Fetch Products] Fetching from Shopify:', org.shopifyStoreName);

    // Get Shopify client
    const { shopify, session } = getShopifyClient(org);
    const client = new shopify.clients.Rest({ session });

    // Fetch all products from Shopify
    const allProducts: any[] = [];
    let pageInfo: string | null = null;

    // Simple pagination: just fetch first page for now
    const response = await client.get({
      path: 'products',
      query: { limit: 250 }
    });

    const products = (response.body as any).products || [];
    allProducts.push(...products);

    console.log(`📦 [Fetch Products] Retrieved ${allProducts.length} products from Shopify`);

    // Format products for frontend
    const formattedProducts = allProducts.map(product => {
      // Get the first variant (most products have one variant)
      const variant = product.variants?.[0];
      
      return {
        shopifyProductId: `gid://shopify/Product/${product.id}`,
        shopifyVariantId: variant ? `gid://shopify/ProductVariant/${variant.id}` : null,
        name: product.title,
        description: product.body_html || null,
        price: variant?.price || '0.00',
        imageUrl: product.image?.src || product.images?.[0]?.src || null,
        tags: product.tags ? product.tags.split(',').map((t: string) => t.trim()) : [],
        // Include raw data for reference
        variantCount: product.variants?.length || 0,
        status: product.status
      };
    });

    // Filter to only active products
    const activeProducts = formattedProducts.filter(p => p.status === 'active');

    console.log(`📦 [Fetch Products] ${activeProducts.length} active products ready for import`);

    return NextResponse.json({
      success: true,
      products: activeProducts,
      totalCount: allProducts.length,
      activeCount: activeProducts.length
    });

  } catch (error: any) {
    console.error('❌ [Fetch Products] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products from Shopify' },
      { status: 500 }
    );
  }
}
