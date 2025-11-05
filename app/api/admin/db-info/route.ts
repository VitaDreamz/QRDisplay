import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/admin/db-info?secret=... - Return safe diagnostics about the DB in use
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (process.env.ADMIN_SECRET && secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional orgId to focus counts
    const orgId = searchParams.get('orgId') || undefined;

    // Basic DB/session info (safe, no secrets)
    const [currentDb, currentUser, serverVersion] = await Promise.all([
      prisma.$queryRawUnsafe<any>(`select current_database() as current_database`),
      prisma.$queryRawUnsafe<any>(`select current_user as current_user`),
      prisma.$queryRawUnsafe<any>(`select version() as version`),
    ]);

    // Product counts
    const totalProducts = await prisma.product.count({ where: orgId ? { orgId } : {} });
  const retailCount = await prisma.product.count({ where: ({ ...(orgId ? { orgId } : {}), productType: 'retail' } as any) });
  const wholesaleBoxCount = await prisma.product.count({ where: ({ ...(orgId ? { orgId } : {}), productType: 'wholesale-box' } as any) });
    const activeCount = await prisma.product.count({ where: { ...(orgId ? { orgId } : {}), active: true } });

    return NextResponse.json({
      ok: true,
      env: {
        nodeEnv: process.env.NODE_ENV,
      },
      db: {
        current_database: currentDb?.[0]?.current_database ?? null,
        current_user: currentUser?.[0]?.current_user ?? null,
        version: serverVersion?.[0]?.version ?? null,
      },
      orgId: orgId || null,
      counts: {
        total: totalProducts,
        retail: retailCount,
        wholesale_box: wholesaleBoxCount,
        active: activeCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin DB Info] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch DB info' }, { status: 500 });
  }
}
