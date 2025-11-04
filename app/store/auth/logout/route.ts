import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  
  // Clear all session cookies
  cookieStore.delete('store-id');
  cookieStore.delete('store-role');
  cookieStore.delete('staff-id');
  // Legacy cookies (for backward compatibility)
  cookieStore.delete('store-session');

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  
  // Clear all session cookies
  cookieStore.delete('store-id');
  cookieStore.delete('store-role');
  cookieStore.delete('staff-id');
  // Legacy cookies (for backward compatibility)
  cookieStore.delete('store-session');

  return NextResponse.redirect(new URL('/store/login', request.url));
}
