import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

/**
 * Super Admin Bypass: Generate instant magic link for store dashboard access
 * No PIN required - super admins get automatic access to any store dashboard
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    // Verify store exists
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: { storeId: true, storeName: true }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Generate one-time magic link token (valid for 5 minutes)
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save magic link
    await prisma.magicLink.create({
      data: {
        token,
        storeId: store.storeId,
        expiresAt,
        used: false,
      }
    });

    // Build redirect URL with token
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const dashboardUrl = `${baseUrl}/store/auth/${token}`;

    // Instant redirect to store dashboard with auto-login
    return NextResponse.redirect(dashboardUrl);
  } catch (error) {
    console.error('Super admin store access error:', error);
    return NextResponse.json(
      { error: 'Failed to generate store access' },
      { status: 500 }
    );
  }
}
