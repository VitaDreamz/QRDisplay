import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/store/login?error=invalid', request.url));
  }

  try {
    // Find valid magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token }
    });

    if (!magicLink) {
      return NextResponse.redirect(new URL('/store/login?error=invalid', request.url));
    }

    // Check if already used
    if (magicLink.used) {
      return NextResponse.redirect(new URL('/store/login?error=used', request.url));
    }

    // Check expiration
    if (magicLink.expiresAt < new Date()) {
      return NextResponse.redirect(new URL('/store/login?error=expired', request.url));
    }

    // Mark as used
    await prisma.magicLink.update({
      where: { token },
      data: { 
        used: true,
        usedAt: new Date() 
      }
    });

    // Create session redirect
    const response = NextResponse.redirect(
      new URL('/store/dashboard', request.url)
    );

    // Set session cookie
    response.cookies.set('store-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Store storeId in cookie for dashboard to read
    response.cookies.set('store-id', magicLink.storeId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.redirect(new URL('/store/login?error=server', request.url));
  }
}
