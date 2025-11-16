import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    // Fetch full brand details with partnerships and products
    const brand = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        brandPartnerships: {
          include: {
            store: {
              select: {
                storeId: true,
                storeName: true,
                city: true,
                state: true,
              }
            }
          }
        }
      }
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Fetch products for this organization
    const products = await prisma.product.findMany({
      where: { orgId: brand.id },
      select: {
        sku: true,
        name: true,
        category: true,
      }
    });

    // Rename brandPartnerships to partnerships for the frontend
    const brandWithDetails = {
      ...brand,
      partnerships: brand.brandPartnerships,
      products,
    };

    return NextResponse.json({ success: true, brand: brandWithDetails });
  } catch (error) {
    console.error('Error fetching brand details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brand details' },
      { status: 500 }
    );
  }
}
