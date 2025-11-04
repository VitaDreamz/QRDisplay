import { NextRequest, NextResponse } from 'next/server';

// Deprecated legacy magic-link verification route.
// We now use permanent Store ID + PIN login.
export async function GET(request: NextRequest) {
  const base = new URL(request.url);
  const dest = new URL('/store/login?migrated=1', base.origin);
  return NextResponse.redirect(dest);
}
