import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Look up the magic link token
  const magicLink = await prisma.magicLink.findUnique({ where: { token } });

  if (!magicLink || magicLink.used || new Date(magicLink.expiresAt) < new Date()) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invalid Link</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f9fafb;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            h1 {
              font-size: 1.5rem;
              font-weight: bold;
              color: #111827;
              margin-bottom: 0.5rem;
            }
            p {
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Invalid or Expired Link</h1>
            <p>This magic link is invalid, expired, or already used.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }

  // 2. Mark the magic link as used
  await prisma.magicLink.update({ 
    where: { token }, 
    data: { used: true, usedAt: new Date() } 
  });

  // 3. Set a session cookie for the store owner
  const cookieStore = await cookies();
  cookieStore.set('store-id', magicLink.storeId, { 
    path: '/', 
    httpOnly: true, 
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });

  // 4. Redirect to the store dashboard (reads storeId from cookie)
  return NextResponse.redirect(
    new URL('/store/dashboard', request.url)
  );
}
