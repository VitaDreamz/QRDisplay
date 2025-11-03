import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  
  // Clear session cookies
  cookieStore.delete('store-session');
  cookieStore.delete('store-id');

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  
  // Clear session cookies
  cookieStore.delete('store-session');
  cookieStore.delete('store-id');

  return NextResponse.redirect(new URL('/store/login', request.url));
}
