import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopifyClient } from '@/lib/shopify';

type ProductImport = {
  shopifyProductId: string;
  shopifyVariantId: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  productType: 'sample' | 'retail' | 'wholesale';
  sku?: string; // Optional custom SKU
};

export async function POST(request: NextRequest) {
  try {
    const { orgId, products } = await request.json();

    if (!orgId || !products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Organization ID and products array are required' },
        { status: 400 }
      );
    }

    console.log(`📥 [Import Products] Importing ${products.length} products for org:`, orgId);

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

    // Get Shopify client
    const { shopify, session } = getShopifyClient(org);
    const client = new shopify.clients.Rest({ session });

    const importedProducts = [];
    const errors = [];

    for (const product of products as ProductImport[]) {
      try {
        // Generate SKU if not provided
        const sku = product.sku || generateSku(org.name, product.name, product.productType);

        // Determine Shopify tag based on product type
        const qrdTag = product.productType === 'sample' 
          ? 'QRD_Sample'
          : product.productType === 'retail'
          ? 'QRD_Retail'
          : 'QRD_Wholesale';

        // Extract numeric product ID from GID
        const productId = product.shopifyProductId.split('/').pop();

        // Update product tags in Shopify
        try {
          // First, get current tags
          const getResponse = await client.get({
            path: `products/${productId}`
          });
          
          const shopifyProduct = (getResponse.body as any).product;
          const currentTags = shopifyProduct.tags ? shopifyProduct.tags.split(',').map((t: string) => t.trim()) : [];
          
          // Add QRD tag if not present
          if (!currentTags.includes(qrdTag)) {
            const updatedTags = [...currentTags, qrdTag].join(', ');
            
            await client.put({
              path: `products/${productId}`,
              data: {
                product: {
                  id: productId,
                  tags: updatedTags
                }
              }
            });
            
            console.log(`✅ [Import] Tagged ${product.name} with ${qrdTag}`);
          }
        } catch (tagError: any) {
          console.warn(`⚠️ [Import] Failed to tag product ${product.name}:`, tagError.message);
          // Continue even if tagging fails
        }

        // Create product in database
        const createdProduct = await prisma.product.create({
          data: {
            sku,
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.imageUrl,
            productType: product.productType,
            shopifyProductId: product.shopifyProductId,
            shopifyVariantId: product.shopifyVariantId,
            orgId: org.id,
            active: true,
            featured: false
          }
        });

        importedProducts.push(createdProduct);
        console.log(`✅ [Import] Created product: ${sku} - ${product.name}`);

      } catch (productError: any) {
        console.error(`❌ [Import] Failed to import ${product.name}:`, productError);
        errors.push({
          product: product.name,
          error: productError.message
        });
      }
    }

    console.log(`📥 [Import Products] Successfully imported ${importedProducts.length} products`);
    if (errors.length > 0) {
      console.warn(`⚠️ [Import Products] ${errors.length} products failed to import`);
    }

    return NextResponse.json({
      success: true,
      imported: importedProducts.length,
      failed: errors.length,
      products: importedProducts,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ [Import Products] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import products' },
      { status: 500 }
    );
  }
}

// Helper function to generate SKU
function generateSku(orgName: string, productName: string, productType: string): string {
  // Get org prefix (first 2-3 letters)
  const orgPrefix = orgName
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase();

  // Get product prefix (first letters of each word)
  const productPrefix = productName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 4)
    .toUpperCase();

  // Type suffix
  const typeSuffix = productType === 'sample' ? 'S' 
    : productType === 'retail' ? 'R'
    : 'W';

  // Random number for uniqueness
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  return `${orgPrefix}-${productPrefix}-${typeSuffix}${random}`;
}
