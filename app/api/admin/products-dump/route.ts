import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/admin/products-dump?secret=...&orgId=ORG-...&limit=20
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (process.env.ADMIN_SECRET && secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = searchParams.get('orgId') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100);

    const products = await prisma.product.findMany({
      where: orgId ? { orgId } : {},
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
    });

    const summary = products.map((p) => ({
      sku: p.sku,
      name: p.name,
      orgId: p.orgId,
      productType: (p as any).productType ?? undefined,
      active: p.active,
      featured: p.featured,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({ ok: true, count: summary.length, orgId: orgId || null, products: summary });
  } catch (error) {
    console.error('[Admin Products Dump] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch products dump' }, { status: 500 });
  }
}
