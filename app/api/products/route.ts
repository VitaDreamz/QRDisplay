import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET /api/products - List all products (filtered by orgId if provided)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const productType = searchParams.get('productType');
    
    console.log('[Products API] GET request received');
    console.log('[Products API] orgId param:', orgId);
    console.log('[Products API] productType param:', productType);
    console.log('[Products API] DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    // Build where clause with optional filters
    const where: any = {};
    if (orgId) where.orgId = orgId;
    if (productType) where.productType = productType;
    
    console.log('[Products API] where clause:', JSON.stringify(where));
    
    const products = await prisma.product.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { active: 'desc' },
        { name: 'asc' }
      ]
    });
    
    console.log('[Products API] Found products:', products.length);
    console.log('[Products API] Product SKUs:', products.map(p => p.sku).join(', '));
    if (products.length === 0) {
      // Check if any products exist at all
      const allProducts = await prisma.product.findMany({});
      console.log('[Products API] Total products in database:', allProducts.length);
      if (allProducts.length > 0) {
        console.log('[Products API] Sample product orgIds:', allProducts.slice(0, 3).map(p => p.orgId));
      }
    }
    
    return NextResponse.json({ products });
  } catch (error) {
    console.error('[Products API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sku,
      orgId,
      name,
      description,
      category,
      price,
      msrp,
      imageUrl,
      active = true,
      featured = false
    } = body;
    
    // Validation
    if (!sku || !orgId || !name || !price) {
      return NextResponse.json(
        { error: 'Missing required fields: sku, orgId, name, price' },
        { status: 400 }
      );
    }
    
    // Check if SKU already exists
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 400 }
      );
    }
    
    const product = await prisma.product.create({
      data: {
        sku,
        orgId,
        name,
        description,
        category,
        price: parseFloat(price),
        msrp: msrp ? parseFloat(msrp) : null,
        imageUrl,
        active,
        featured
      }
    });
    
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('[Products API] POST error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

// PUT /api/products - Update a product
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sku,
      name,
      description,
      category,
      price,
      msrp,
      imageUrl,
      active,
      featured
    } = body;
    
    if (!sku) {
      return NextResponse.json({ error: 'SKU is required' }, { status: 400 });
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (msrp !== undefined) updateData.msrp = msrp ? parseFloat(msrp) : null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (active !== undefined) updateData.active = active;
    if (featured !== undefined) updateData.featured = featured;
    
    const product = await prisma.product.update({
      where: { sku },
      data: updateData
    });
    
    return NextResponse.json({ product });
  } catch (error) {
    console.error('[Products API] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/products?sku=XXX - Delete a product
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sku = searchParams.get('sku');
    
    if (!sku) {
      return NextResponse.json({ error: 'SKU is required' }, { status: 400 });
    }
    
    // Check if product is in use
    const intentCount = await prisma.purchaseIntent.count({
      where: { productSku: sku }
    });
    
    if (intentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete product: ${intentCount} purchase intents exist` },
        { status: 400 }
      );
    }
    
    await prisma.product.delete({
      where: { sku }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Products API] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
