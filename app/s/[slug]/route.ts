import { NextRequest, NextResponse } from 'next/server';

// Legacy shortlink route for store login.
// We migrated to permanent Store ID + PIN login, so redirect old links
// to the new login entry. We intentionally avoid any DB lookups here.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = new URL(req.url);
  const dest = new URL('/store/login', base.origin);
  // Carry the slug only as a hint for support; not used for auth anymore
  if (slug) dest.searchParams.set('migrated', '1');
  return NextResponse.redirect(dest);
}
