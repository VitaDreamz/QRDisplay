import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.redirect(new URL('/store/login?error=invalid', _req.url));
  }

  try {
    const record = await prisma.shortlink.findUnique({ where: { slug } });
    if (!record || record.action !== 'store_login') {
      return NextResponse.redirect(new URL('/store/login?error=invalid', _req.url));
    }

    // Optional single-use: if (record.usedAt) -> consider invalid
    // if (record.usedAt) {
    //   return NextResponse.redirect(new URL('/store/login?error=used', _req.url));
    // }

    // Create a fresh magic link token (valid for 48 hours)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await prisma.magicLink.create({
      data: {
        token,
        storeId: record.storeId,
        expiresAt,
        used: false
      }
    });

    // Optionally mark shortlink as used; comment out to allow re-use
    // await prisma.shortlink.update({ where: { slug }, data: { usedAt: new Date() } });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const verifyUrl = `${baseUrl}/store/auth/verify?token=${token}`;
    return NextResponse.redirect(verifyUrl);
  } catch (err) {
    console.error('Shortlink error:', err);
    return NextResponse.redirect(new URL('/store/login?error=server', _req.url));
  }
}
